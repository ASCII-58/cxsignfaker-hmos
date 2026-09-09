import relationalStore from '@ohos.data.relationalStore';
import common from '@ohos.app.ability.common';
import { BusinessError } from '@ohos.base';
import { hilog } from '@kit.PerformanceAnalysisKit';

interface UserData {
  phone: string;
  pwd: string;
  cookies: string;
  uid: number
}

export interface UserDataAndId {
  id: number
  phone: string;
  pwd: string;
  cookies: string;
  uid: number
}

/**
 * 可更新的用户数据接口
 */
interface UpdateUserData {
  phone?: string;
  pwd?: string;
  cookies?: string;
}

/**
 * 收藏的位置（行记录，含自增 id）
 * latitude/longitude 为签到提交用的 BD-09 坐标字符串，选用时可直接赋给签到参数
 */
export interface SavedLocation {
  id: number
  note: string
  latitude: string
  longitude: string
  address: string
}

interface SavedLocationData {
  note: string
  latitude: string
  longitude: string
  address: string
}

interface UpdateSavedLocation {
  note?: string
  latitude?: string
  longitude?: string
  address?: string
}

interface ExportUserEntry {
  phone: string;
  pwd: string;
  cookies: string;
  uid: number;
}

interface ExportData {
  version: number;
  exportedAt: string;
  HostUser: ExportUserEntry[];
  OtherUser: ExportUserEntry[];
}

interface ImportResult {
  success: boolean;
  message: string;
}

/**
 * 待写入的签到统计记录（SignRecord 表）
 * action: 'sign' = 签到尝试 | 'signout' = 签退尝试
 * kind: 对齐 parseSignResult 的结果类型（success/already/error/...）
 */
export interface SignRecordData {
  uname: string
  activityId: string
  activityName: string
  signType: string
  action: string
  kind: string
  message: string
}

/** 签到统计记录（含自增 id 与落库时间戳，毫秒） */
export interface SignRecord {
  id: number
  uname: string
  activityId: string
  activityName: string
  signType: string
  action: string
  kind: string
  message: string
  createTime: number
}

/** 签到统计汇总（sign* 字段仅统计 action='sign' 的记录） */
export interface SignStats {
  signTotal: number
  signSuccess: number
  signAlready: number
  signFailed: number
  signOutSuccess: number
  typeCounts: SignTypeCount[]
}

/** 按签到类型（SignType 字符串值）的次数分布 */
export interface SignTypeCount {
  signType: string
  count: number
}

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private rdbStore: relationalStore.RdbStore | null = null;

  private constructor() {
  }

  public static getInstance(): DatabaseManager {
    if (DatabaseManager.instance === null) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public isInitialized(): boolean {
    return this.rdbStore !== null;
  }

  async init(context: common.UIAbilityContext): Promise<void> {
    if (this.rdbStore !== null) {
      return;
    }
    const STORE_CONFIG: relationalStore.StoreConfig = {
      name: 'data.db',
      securityLevel: relationalStore.SecurityLevel.S1
    };

    try {
      this.rdbStore = await relationalStore.getRdbStore(context, STORE_CONFIG);
      await this.createTables();
    } catch (err) {
      const error = err as BusinessError;
      console.error(`Failed to get RdbStore. Code: ${error.code}, Message: ${error.message}`);
    }
  }

  /**
   * 检查HostUser表是否为空
   *
   * @returns {Promise<boolean>} 如果表为空则返回true，否则返回false
   * @throws {Error} 如果数据库未初始化
   * @throws {BusinessError} 如果查询过程中发生错误
   */
  public async isHostUserTableEmpty(): Promise<boolean> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      // 使用高效查询：只需检查是否存在至少一行数据
      const sql = 'SELECT 1 FROM HostUser LIMIT 1';
      const resultSet = await this.rdbStore.querySql(sql);

      try {
        // rowCount为0表示没有数据
        return resultSet.rowCount === 0;
      } finally {
        // 确保无论查询结果如何都关闭结果集
        resultSet.close();
      }
    } catch (error) {
      const err = new Error(`Database init failed: ${error.message}`);
      hilog.error(0x0000, 'DB_INIT', err.message);
      throw err;
    }
  }

  /**
   * 插入用户数据（统一处理主用户和其他用户）
   * @param userData 用户数据对象
   * @param isHost 是否插入为主用户，默认false
   * @returns 插入结果状态码：1-成功，-1-手机号已存在，-2-主用户已存在，0-失败
   */
  public async insertUser(userData: UserData, isHost: boolean = false): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    // 输入参数验证
    if (!userData.phone || !userData.pwd || !userData.cookies || !userData.uid) {
      throw new Error('手机号、密码、cookies和uid不能为空');
    }

    if (userData.phone.trim().length === 0) {
      throw new Error('手机号不能为空字符串');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        // 检查手机号是否已存在
        const phoneExists = await this.checkPhoneExists(userData.phone);
        if (phoneExists) {
          this.rdbStore.rollBack();
          return -1; // 手机号已存在
        }

        // 如果是主用户，检查是否已有主用户
        if (isHost) {
          const isHostUserEmpty = await this.isHostUserTableEmpty();
          if (!isHostUserEmpty) {
            this.rdbStore.rollBack();
            return -2; // 主用户已存在
          }
        }

        // 根据用户类型选择表名
        const tableName = isHost ? 'HostUser' : 'OtherUser';

        // 记录插入前的记录数
        const countBefore = await this.getTableCount(tableName);

        // 执行插入操作
        const insertSql = `INSERT INTO ${tableName} (phone, pwd, cookies, uid) VALUES (?, ?, ?, ?)`;
        await this.rdbStore.executeSql(insertSql, [
          userData.phone,
          userData.pwd,
          userData.cookies,
          userData.uid
        ]);

        // 提交事务
        this.rdbStore.commit();
        // 验证插入结果：检查记录数是否增加
        const countAfter = await this.getTableCount(tableName);
        if (countAfter !== countBefore + 1) {
          throw new Error('插入操作未成功，记录数未增加');
        }


        hilog.info(0x0000, 'DB',
          `Successfully inserted ${isHost ? 'host' : 'other'} user: ${userData.phone.substring(0, 3)}***`);
        return 1; // 插入成功

      } catch (error) {
        // 回滚事务
        this.rdbStore.rollBack();
        throw Error(error);
      }
    } catch (err) {
      // 外层错误处理
      hilog.error(0x0000, 'DB', `Failed to insert ${isHost ? 'host' : 'other'} user: ${err.message}`);
      return 0; // 插入失败
    }
  }

  /**
   * 获取表中所有用户数据
   * @param isHost 是否查询主用户表，默认false
   * @returns 包含所有用户数据的数组
   */
  public async getAllUsers(isHost: boolean = false): Promise<UserDataAndId[]> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const tableName = isHost ? 'HostUser' : 'OtherUser';
    const sql = `SELECT * FROM ${tableName}`;

    try {
      const resultSet = await this.rdbStore.querySql(sql);
      const users: UserDataAndId[] = [];

      while (resultSet.goToNextRow()) {
        users.push({
          id: resultSet.getLong(resultSet.getColumnIndex('id')),
          phone: resultSet.getString(resultSet.getColumnIndex('phone')),
          pwd: resultSet.getString(resultSet.getColumnIndex('pwd')),
          cookies: resultSet.getString(resultSet.getColumnIndex('cookies')),
          uid: resultSet.getLong(resultSet.getColumnIndex('uid'))
        });
      }

      resultSet.close();
      return users;
    } catch (error) {
      const err = new Error(`Failed to fetch users from ${tableName}: ${error.message}`);
      hilog.error(0x0000, 'DB', err.message);
      throw err;
    }
  }

  /**
   * 更新单个用户数据
   * @param id 用户ID
   * @param userData 要更新的用户数据
   * @param isHost 是否更新主用户表，默认false
   * @returns 更新结果状态码：1-成功，-1-用户不存在，-2-手机号已存在，0-失败
   */
  public async updateUser(
    id: number,
    userData: UpdateUserData,
    isHost: boolean = false
  ): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    // 参数验证
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('无效的用户ID');
    }

    // 检查是否有要更新的字段
    const hasUpdateField = userData.phone !== undefined ||
      userData.pwd !== undefined ||
      userData.cookies !== undefined;

    if (!hasUpdateField) {
      throw new Error('至少需要提供一个要更新的字段');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        const tableName = isHost ? 'HostUser' : 'OtherUser';

        // 检查用户是否存在
        const userExists = await this.userExists(isHost, id);
        if (!userExists) {
          this.rdbStore.rollBack();
          return -1; // 用户不存在
        }

        // 如果要更新手机号，检查唯一性
        if (userData.phone !== undefined) {
          const phoneExists = await this.checkPhoneExists(userData.phone);
          if (phoneExists) {
            this.rdbStore.rollBack();
            return -2; // 手机号已存在
          }
        }

        // 构建更新语句
        const updateParts: string[] = [];
        const params: (string | number)[] = [];

        if (userData.phone !== undefined) {
          updateParts.push('phone = ?');
          params.push(userData.phone);
        }
        if (userData.pwd !== undefined) {
          updateParts.push('pwd = ?');
          params.push(userData.pwd);
        }
        if (userData.cookies !== undefined) {
          updateParts.push('cookies = ?');
          params.push(userData.cookies);
        }

        params.push(id);
        const updateSql = `UPDATE ${tableName} SET ${updateParts.join(', ')} WHERE id = ?`;

        // 执行更新
        await this.rdbStore.executeSql(updateSql, params);
        this.rdbStore.commit();

        return 1; // 更新成功

      } catch (error) {
        this.rdbStore.rollBack();
        throw new Error(error);
      }
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to update user: ${err.message}`);
      return 0; // 更新失败
    }
  }

  /**
   * 根据位置获取第几条用户数据（从1开始计数）- 使用RdbPredicates
   * @param position 位置序号，从1开始
   * @param isHost 是否查询主用户表，默认false
   * @param orderBy 排序字段，默认按id排序
   * @param ascending 是否升序排列，默认true
   * @returns 用户数据或null（如果位置超出范围）
   */
  public async getUserByPosition(
    position: number,
    isHost: boolean = false,
    orderBy: string = 'id',
    ascending: boolean = true
  ): Promise<UserDataAndId | null> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    // 参数验证
    if (!Number.isInteger(position) || position <= 0) {
      throw new Error('位置序号必须是大于0的整数');
    }

    try {
      const tableName = isHost ? 'HostUser' : 'OtherUser';

      // 使用RdbPredicates进行查询
      let predicates = new relationalStore.RdbPredicates(tableName);

      // 设置排序
      if (ascending) {
        predicates.orderByAsc(orderBy);
      } else {
        predicates.orderByDesc(orderBy);
      }

      // 设置偏移和限制：获取第position条记录
      // offsetAs的参数是从0开始的，所以第n条记录的offset是n-1
      predicates.limitAs(1).offsetAs(position - 1);

      const resultSet = await this.rdbStore.query(predicates);

      if (resultSet.rowCount > 0) {
        resultSet.goToFirstRow();

        const userData: UserDataAndId = {
          id: resultSet.getLong(resultSet.getColumnIndex('id')),
          uid: resultSet.getLong(resultSet.getColumnIndex('uid')),
          phone: resultSet.getString(resultSet.getColumnIndex('phone')),
          pwd: resultSet.getString(resultSet.getColumnIndex('pwd')),
          cookies: resultSet.getString(resultSet.getColumnIndex('cookies'))
        };

        resultSet.close();
        return userData;
      }

      resultSet.close();
      return null; // 位置超出范围

    } catch (error) {
      hilog.error(0x0000, 'DB', `Failed to get user by position ${position}: ${error.message}`);
      throw Error(error);
    }
  }

  /**
   * 按签到用户 ID 取用户（0 = 主用户/HostUser 第 1 条，N = OtherUser 第 N 条）
   *
   * @param userId 签到用户 ID（SignerPage 勾选列表中的 ID）
   * @returns 用户数据或null
   */
  public async getUserById(userId: number): Promise<UserDataAndId | null> {
    if (userId === 0) {
      return await this.getUserByPosition(1, true);
    }
    return await this.getUserByPosition(userId, false);
  }

  /**
   * 获取指定表的记录数量
   *
   * @param tableName 要查询的表名（必须是允许的表）
   * @returns {Promise<number>} 表中的记录数量
   * @throws {Error} 如果数据库未初始化或表名无效
   */
  public async getTableCount(tableName: 'HostUser' | 'OtherUser' | 'SignRecord'): Promise<number> {
    // 验证表名合法性，防止SQL注入
    const allowedTables = ['HostUser', 'OtherUser', 'SignRecord'];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`无效的表名: ${tableName}. 允许的表: ${allowedTables.join(', ')}`);
    }

    if (!this.rdbStore) {
      throw new Error('数据库未初始化。请先调用init()方法。');
    }

    try {
      // 使用COUNT(*)获取表记录数
      const sql = `SELECT COUNT(*) AS count FROM ${tableName}`;
      const resultSet = await this.rdbStore.querySql(sql);

      try {
        if (resultSet.rowCount > 0) {
          resultSet.goToFirstRow();
          const columnIndex = resultSet.getColumnIndex('count');
          return resultSet.getLong(columnIndex);
        }
        return 0;
      } finally {
        // 确保结果集被正确关闭
        resultSet.close();
      }
    } catch (err) {
      const error = err as BusinessError;
      console.error(`获取表 ${tableName} 记录数失败. 错误码: ${error.code}, 消息: ${error.message}`);
      throw new Error(`无法获取表记录数: ${error.message}`);
    }
  }

  getRdbStore(): relationalStore.RdbStore {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.rdbStore;
  }

  /**
   * 删除指定用户
   * @param id 用户ID
   * @param isHost 是否删除主用户表，默认false
   * @returns 删除结果状态码：1-成功，-1-用户不存在，0-失败
   */
  public async deleteUser(id: number, isHost: boolean = false): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    // 参数验证
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('无效的用户ID');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        const tableName = isHost ? 'HostUser' : 'OtherUser';

        // 检查用户是否存在
        const userExists = await this.userExists(isHost, id);
        if (!userExists) {
          this.rdbStore.rollBack();
          return -1; // 用户不存在
        }

        // 使用RdbPredicates进行删除
        let predicates = new relationalStore.RdbPredicates(tableName);
        predicates.equalTo('id', id);

        // 执行删除操作
        const deletedRows = await this.rdbStore.delete(predicates);

        if (deletedRows > 0) {
          this.rdbStore.commit();
          hilog.info(0x0000, 'DB', `Successfully deleted ${isHost ? 'host' : 'other'} user ID: ${id}`);
          return 1; // 删除成功
        } else {
          this.rdbStore.rollBack();
          return -1; // 没有删除任何记录
        }

      } catch (error) {
        this.rdbStore.rollBack();
        throw Error(error);
      }
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to delete ${isHost ? 'host' : 'other'} user ID ${id}: ${err.message}`);
      return 0; // 删除失败
    }
  }

  /**
   * 插入收藏位置
   * @param locationData 位置数据（note 备注可为空字符串）
   * @returns 插入结果状态码：1-成功，0-失败
   */
  public async insertSavedLocation(locationData: SavedLocationData): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    if (!locationData.latitude || !locationData.longitude) {
      throw new Error('经纬度不能为空');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        await this.rdbStore.executeSql(
          'INSERT INTO SavedLocation (note, latitude, longitude, address) VALUES (?, ?, ?, ?)',
          [locationData.note, locationData.latitude, locationData.longitude, locationData.address]
        );
        this.rdbStore.commit();
        hilog.info(0x0000, 'DB', `Successfully inserted saved location: ${locationData.note}`);
        return 1; // 插入成功
      } catch (error) {
        this.rdbStore.rollBack();
        throw Error(error);
      }
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to insert saved location: ${err.message}`);
      return 0; // 插入失败
    }
  }

  /**
   * 获取所有收藏位置（按 id 倒序，最新添加的在前）
   * @returns 收藏位置数组
   */
  public async getAllSavedLocations(): Promise<SavedLocation[]> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const sql = 'SELECT * FROM SavedLocation ORDER BY id DESC';

    try {
      const resultSet = await this.rdbStore.querySql(sql);
      const locations: SavedLocation[] = [];

      while (resultSet.goToNextRow()) {
        locations.push({
          id: resultSet.getLong(resultSet.getColumnIndex('id')),
          note: resultSet.getString(resultSet.getColumnIndex('note')),
          latitude: resultSet.getString(resultSet.getColumnIndex('latitude')),
          longitude: resultSet.getString(resultSet.getColumnIndex('longitude')),
          address: resultSet.getString(resultSet.getColumnIndex('address'))
        });
      }

      resultSet.close();
      return locations;
    } catch (error) {
      const err = new Error(`Failed to fetch saved locations: ${error.message}`);
      hilog.error(0x0000, 'DB', err.message);
      throw err;
    }
  }

  /**
   * 更新单个收藏位置
   * @param id 位置ID
   * @param locationData 要更新的位置数据（至少提供一个字段）
   * @returns 更新结果状态码：1-成功，-1-位置不存在，0-失败
   */
  public async updateSavedLocation(id: number, locationData: UpdateSavedLocation): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('无效的位置ID');
    }

    const updateParts: string[] = [];
    const params: (string | number)[] = [];

    if (locationData.note !== undefined) {
      updateParts.push('note = ?');
      params.push(locationData.note);
    }
    if (locationData.latitude !== undefined) {
      updateParts.push('latitude = ?');
      params.push(locationData.latitude);
    }
    if (locationData.longitude !== undefined) {
      updateParts.push('longitude = ?');
      params.push(locationData.longitude);
    }
    if (locationData.address !== undefined) {
      updateParts.push('address = ?');
      params.push(locationData.address);
    }

    if (updateParts.length === 0) {
      throw new Error('至少需要提供一个要更新的字段');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        const exists = await this.savedLocationExists(id);
        if (!exists) {
          this.rdbStore.rollBack();
          return -1; // 位置不存在
        }

        params.push(id);
        const updateSql = `UPDATE SavedLocation SET ${updateParts.join(', ')} WHERE id = ?`;
        await this.rdbStore.executeSql(updateSql, params);
        this.rdbStore.commit();

        return 1; // 更新成功
      } catch (error) {
        this.rdbStore.rollBack();
        throw new Error(error);
      }
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to update saved location: ${err.message}`);
      return 0; // 更新失败
    }
  }

  /**
   * 删除指定收藏位置
   * @param id 位置ID
   * @returns 删除结果状态码：1-成功，-1-位置不存在，0-失败
   */
  public async deleteSavedLocation(id: number): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('无效的位置ID');
    }

    try {
      this.rdbStore.beginTransaction();

      try {
        const exists = await this.savedLocationExists(id);
        if (!exists) {
          this.rdbStore.rollBack();
          return -1; // 位置不存在
        }

        const predicates = new relationalStore.RdbPredicates('SavedLocation');
        predicates.equalTo('id', id);
        const deletedRows = await this.rdbStore.delete(predicates);

        if (deletedRows > 0) {
          this.rdbStore.commit();
          hilog.info(0x0000, 'DB', `Successfully deleted saved location ID: ${id}`);
          return 1; // 删除成功
        } else {
          this.rdbStore.rollBack();
          return -1; // 没有删除任何记录
        }
      } catch (error) {
        this.rdbStore.rollBack();
        throw Error(error);
      }
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to delete saved location ID ${id}: ${err.message}`);
      return 0; // 删除失败
    }
  }

  /**
   * 清空HostUser表中的所有数据
   *
   * @returns {Promise<number>} 删除的记录数量
   * @throws {Error} 如果数据库未初始化或操作失败
   */
  public async clearHostUserTable(): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('数据库未初始化。请先调用init()方法。');
    }

    try {
      // 开始事务确保操作原子性
      this.rdbStore.beginTransaction();

      try {
        // 1. 先获取当前记录数（用于返回结果）
        const countResult = await this.rdbStore.querySql('SELECT COUNT(*) AS count FROM HostUser');
        let rowCount = 0;

        try {
          if (countResult.rowCount > 0) {
            countResult.goToFirstRow();
            rowCount = countResult.getLong(countResult.getColumnIndex('count'));
          }
        } finally {
          countResult.close();
        }

        // 2. 执行删除操作
        await this.rdbStore.executeSql('DELETE FROM HostUser');

        // 3. 重置自增ID（SQLite中需要额外操作）
        await this.rdbStore.executeSql('DELETE FROM sqlite_sequence WHERE name = "HostUser"');

        // 4. 提交事务
        this.rdbStore.commit();

        console.log(`成功清空HostUser表，删除${rowCount}条记录`);
        return rowCount;
      } catch (error) {
        // 5. 发生错误时回滚事务
        this.rdbStore.rollBack();
        throw this.normalizeError(error, '清空HostUser表失败');
      }
    } catch (err) {
      throw this.normalizeError(err, '清空HostUser表操作异常');
    }
  }

  /**
   * 导出数据库为JSON字符串
   * @returns JSON格式的数据库内容
   */
  public async exportToJSON(): Promise<string> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const hostUsers = await this.getAllUsers(true);
    const otherUsers = await this.getAllUsers(false);

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      HostUser: hostUsers.map((u: UserDataAndId): ExportUserEntry => ({
        phone: u.phone,
        pwd: u.pwd,
        cookies: u.cookies,
        uid: u.uid
      })),
      OtherUser: otherUsers.map((u: UserDataAndId): ExportUserEntry => ({
        phone: u.phone,
        pwd: u.pwd,
        cookies: u.cookies,
        uid: u.uid
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从JSON字符串导入数据库
   * @param json JSON格式的数据库内容
   * @returns 导入结果
   */
  public async importFromJSON(json: string): Promise<ImportResult> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    let data: ExportData;

    try {
      data = JSON.parse(json) as ExportData;
    } catch {
      const result: ImportResult = { success: false, message: '文件格式错误：无法解析JSON' };
      return result;
    }

    if (typeof data.version !== 'number') {
      const result: ImportResult = { success: false, message: '文件格式错误：缺少版本号' };
      return result;
    }
    if (!Array.isArray(data.HostUser) || !Array.isArray(data.OtherUser)) {
      const result: ImportResult = { success: false, message: '文件格式错误：缺少用户数据' };
      return result;
    }

    const validateUserEntry = (entry: ExportUserEntry, tableName: string): ImportResult | null => {
      if (typeof entry.phone !== 'string' || entry.phone.trim().length === 0) {
        const result: ImportResult = { success: false, message: `${tableName} 中存在缺少手机号的记录` };
        return result;
      }
      if (typeof entry.pwd !== 'string' || entry.pwd.trim().length === 0) {
        const result: ImportResult = { success: false, message: `${tableName} 中存在缺少密码的记录` };
        return result;
      }
      if (typeof entry.cookies !== 'string' || entry.cookies.trim().length === 0) {
        const result: ImportResult = { success: false, message: `${tableName} 中存在缺少cookies的记录` };
        return result;
      }
      if (typeof entry.uid !== 'number' || entry.uid <= 0 || !Number.isInteger(entry.uid)) {
        const result: ImportResult = { success: false, message: `${tableName} 中存在无效uid的记录` };
        return result;
      }
      return null;
    };

    for (const entry of data.HostUser) {
      const err = validateUserEntry(entry, 'HostUser');
      if (err) {
        return err;
      }
    }
    for (const entry of data.OtherUser) {
      const err = validateUserEntry(entry, 'OtherUser');
      if (err) {
        return err;
      }
    }

    try {
      this.rdbStore.beginTransaction();

      await this.rdbStore.executeSql('DELETE FROM OtherUser');
      await this.rdbStore.executeSql('DELETE FROM HostUser');
      await this.rdbStore.executeSql('DELETE FROM sqlite_sequence WHERE name = "HostUser"');
      await this.rdbStore.executeSql('DELETE FROM sqlite_sequence WHERE name = "OtherUser"');

      for (const entry of data.HostUser) {
        await this.rdbStore.executeSql(
          'INSERT INTO HostUser (phone, pwd, cookies, uid) VALUES (?, ?, ?, ?)',
          [entry.phone, entry.pwd, entry.cookies, entry.uid]
        );
      }
      for (const entry of data.OtherUser) {
        await this.rdbStore.executeSql(
          'INSERT INTO OtherUser (phone, pwd, cookies, uid) VALUES (?, ?, ?, ?)',
          [entry.phone, entry.pwd, entry.cookies, entry.uid]
        );
      }

      this.rdbStore.commit();
      const result: ImportResult = { success: true, message: `导入成功：${data.HostUser.length} 个主用户，${data.OtherUser.length} 个其他用户` };
      return result;
    } catch (err) {
      this.rdbStore.rollBack();
      const result: ImportResult = { success: false, message: `导入失败：${(err as Error).message}` };
      return result;
    }
  }

  // ---------------- 签到统计（SignRecord 表） ----------------

  /**
   * 插入一条签到/签退统计记录
   * @returns 插入结果状态码：1-成功，0-失败
   */
  public async insertSignRecord(record: SignRecordData): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    if (!record.uname || !record.kind || !record.action) {
      throw new Error('用户名、操作类型与结果类型不能为空');
    }

    try {
      await this.rdbStore.executeSql(
        'INSERT INTO SignRecord (uname, activityId, activityName, signType, action, kind, message, createTime) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [record.uname, record.activityId, record.activityName, record.signType,
          record.action, record.kind, record.message, Date.now()]
      );
      return 1;
    } catch (err) {
      hilog.error(0x0000, 'DB', `Failed to insert sign record: ${err.message}`);
      return 0;
    }
  }

  /**
   * 获取最近的签到统计记录（按落库时间倒序）
   * @param limit 返回条数上限（更早的记录不返回，但仍参与汇总统计）
   */
  public async getSignRecords(limit: number): Promise<SignRecord[]> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      const resultSet = await this.rdbStore.querySql(
        'SELECT * FROM SignRecord ORDER BY id DESC LIMIT ?', [limit]);
      const records: SignRecord[] = [];
      while (resultSet.goToNextRow()) {
        records.push({
          id: resultSet.getLong(resultSet.getColumnIndex('id')),
          uname: resultSet.getString(resultSet.getColumnIndex('uname')),
          activityId: resultSet.getString(resultSet.getColumnIndex('activityId')),
          activityName: resultSet.getString(resultSet.getColumnIndex('activityName')),
          signType: resultSet.getString(resultSet.getColumnIndex('signType')),
          action: resultSet.getString(resultSet.getColumnIndex('action')),
          kind: resultSet.getString(resultSet.getColumnIndex('kind')),
          message: resultSet.getString(resultSet.getColumnIndex('message')),
          createTime: resultSet.getLong(resultSet.getColumnIndex('createTime'))
        });
      }
      resultSet.close();
      return records;
    } catch (error) {
      const err = new Error(`Failed to fetch sign records: ${error.message}`);
      hilog.error(0x0000, 'DB', err.message);
      throw err;
    }
  }

  /**
   * 签到统计汇总：签到次数/成功/已签到/失败、签退成功次数与按类型分布
   */
  public async getSignStats(): Promise<SignStats> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const stats: SignStats = {
      signTotal: 0, signSuccess: 0, signAlready: 0, signFailed: 0,
      signOutSuccess: 0, typeCounts: []
    };

    try {
      const summarySet = await this.rdbStore.querySql(
        `SELECT
          IFNULL(SUM(CASE WHEN action = 'sign' THEN 1 ELSE 0 END), 0) AS signTotal,
          IFNULL(SUM(CASE WHEN action = 'sign' AND kind = 'success' THEN 1 ELSE 0 END), 0) AS signSuccess,
          IFNULL(SUM(CASE WHEN action = 'sign' AND kind = 'already' THEN 1 ELSE 0 END), 0) AS signAlready,
          IFNULL(SUM(CASE WHEN action = 'sign' AND kind NOT IN ('success', 'already') THEN 1 ELSE 0 END), 0) AS signFailed,
          IFNULL(SUM(CASE WHEN action = 'signout' AND kind = 'success' THEN 1 ELSE 0 END), 0) AS signOutSuccess
        FROM SignRecord`);
      try {
        if (summarySet.goToFirstRow()) {
          stats.signTotal = summarySet.getLong(summarySet.getColumnIndex('signTotal'));
          stats.signSuccess = summarySet.getLong(summarySet.getColumnIndex('signSuccess'));
          stats.signAlready = summarySet.getLong(summarySet.getColumnIndex('signAlready'));
          stats.signFailed = summarySet.getLong(summarySet.getColumnIndex('signFailed'));
          stats.signOutSuccess = summarySet.getLong(summarySet.getColumnIndex('signOutSuccess'));
        }
      } finally {
        summarySet.close();
      }

      const typeSet = await this.rdbStore.querySql(
        "SELECT signType, COUNT(*) AS count FROM SignRecord WHERE action = 'sign' " +
        'GROUP BY signType ORDER BY count DESC');
      try {
        while (typeSet.goToNextRow()) {
          stats.typeCounts.push({
            signType: typeSet.getString(typeSet.getColumnIndex('signType')),
            count: typeSet.getLong(typeSet.getColumnIndex('count'))
          });
        }
      } finally {
        typeSet.close();
      }
      return stats;
    } catch (error) {
      const err = new Error(`Failed to fetch sign stats: ${error.message}`);
      hilog.error(0x0000, 'DB', err.message);
      throw err;
    }
  }

  /**
   * 清空全部签到统计记录
   * @returns 删除的记录数量
   */
  public async clearSignRecords(): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('数据库未初始化。请先调用init()方法。');
    }

    try {
      this.rdbStore.beginTransaction();
      try {
        const countBefore = await this.getTableCount('SignRecord');
        await this.rdbStore.executeSql('DELETE FROM SignRecord');
        await this.rdbStore.executeSql('DELETE FROM sqlite_sequence WHERE name = "SignRecord"');
        this.rdbStore.commit();
        hilog.info(0x0000, 'DB', `Cleared ${countBefore} sign records`);
        return countBefore;
      } catch (error) {
        this.rdbStore.rollBack();
        throw this.normalizeError(error, '清空签到统计记录失败');
      }
    } catch (err) {
      throw this.normalizeError(err, '清空签到统计记录操作异常');
    }
  }

  async close(): Promise<void> {
    if (this.rdbStore) {
      try {
        await this.rdbStore.close();
        this.rdbStore = null;
      } catch (err) {
        const error = err as BusinessError;
        console.error(`Failed to close database. Code: ${error.code}, Message: ${error.message}`);
      }
    }
    DatabaseManager.instance = null;
  }

  //创建表
  private async createTables(): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      await this.rdbStore.executeSql(`
        CREATE TABLE IF NOT EXISTS HostUser (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          pwd TEXT NOT NULL,
          cookies TEXT NOT NULL,
          uid INTEGER NOT NULL
        );
      `);

      await this.rdbStore.executeSql(`
        CREATE TABLE IF NOT EXISTS OtherUser (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          pwd TEXT NOT NULL,
          cookies TEXT NOT NULL,
          uid INTEGER NOT NULL
        );
      `);

      await this.rdbStore.executeSql(`
        CREATE TABLE IF NOT EXISTS SavedLocation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          note TEXT NOT NULL,
          latitude TEXT NOT NULL,
          longitude TEXT NOT NULL,
          address TEXT NOT NULL DEFAULT ''
        );
      `);

      await this.rdbStore.executeSql(`
        CREATE TABLE IF NOT EXISTS SignRecord (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uname TEXT NOT NULL,
          activityId TEXT NOT NULL DEFAULT '',
          activityName TEXT NOT NULL DEFAULT '',
          signType TEXT NOT NULL DEFAULT '',
          action TEXT NOT NULL DEFAULT 'sign',
          kind TEXT NOT NULL,
          message TEXT NOT NULL DEFAULT '',
          createTime INTEGER NOT NULL
        );
      `);
    } catch (err) {
      const error = err as BusinessError;
      console.error(`Failed to create tables. Code: ${error.code}, Message: ${error.message}`);
    }
  }

  private normalizeError(err: Error, message: string): Error {
    return new Error(`${message} [原因]: ${err.message}`);
  }

  // 辅助方法：检查用户是否存在
  private async userExists(isHost: boolean, id: number): Promise<boolean> {
    if (!this.rdbStore) {
      return false;
    }
    const table = isHost ? 'HostUser' : 'OtherUser';
    const sql = `SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`;
    const resultSet = await this.rdbStore.querySql(sql, [id]);
    try {
      return resultSet.rowCount > 0;
    } finally {
      resultSet.close();
    }
  }

  // 辅助方法：检查收藏位置是否存在
  private async savedLocationExists(id: number): Promise<boolean> {
    if (!this.rdbStore) {
      return false;
    }
    const sql = 'SELECT 1 FROM SavedLocation WHERE id = ? LIMIT 1';
    const resultSet = await this.rdbStore.querySql(sql, [id]);
    try {
      return resultSet.rowCount > 0;
    } finally {
      resultSet.close();
    }
  }

  /**
   * 检查手机号是否已存在（跨两个表检查）
   *
   * @param phone 要检查的手机号
   * @returns {Promise<boolean>} 如果手机号已存在则返回true
   */
  private async checkPhoneExists(phone: string): Promise<boolean> {
    if (!this.rdbStore) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      // 使用UNION检查两个表
      const sql = `
      SELECT 1 FROM HostUser WHERE phone = ?
      UNION
      SELECT 1 FROM OtherUser WHERE phone = ?
      LIMIT 1
    `;

      const resultSet = await this.rdbStore.querySql(sql, [phone, phone]);

      try {
        return resultSet.rowCount > 0;
      } finally {
        // 确保结果集被关闭
        resultSet.close();
      }
    } catch (err) {
      const error = err as BusinessError;
      console.error(`Failed to check phone existence. Code: ${error.code}, Message: ${error.message}`);
      throw new Error(`插入错误,${error}`)
    }
  }
}
export {
  DatabaseManager, UserData
}