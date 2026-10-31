if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SearchLongTakeTransitionPageTwo_Params {
    pageInfos?: NavPathStack;
    searchText?: string;
    allCourses?: ClassInfo[];
    filteredCourses?: ClassInfo[];
    isLoading?: boolean;
    cloneSessionCookies?: string;
}
interface CourseItem_Params {
    course?: ClassInfo;
    courseImage?: image.PixelMap | null;
    isPressed?: boolean;
    onCourseClick?: (course: ClassInfo) => void;
}
import curves from "@native:ohos.curves";
import promptAction from "@ohos:promptAction";
import { CourseAndActivity } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import type { ClassInfo } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import type image from "@ohos:multimedia.image";
import hilog from "@ohos:hilog";
const TAG = 'SearchCoursePage';
const DOMAIN = 0x0007;
export function init(parent = null) {
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
            if (isInitialRender) {
                let componentCall = new SearchLongTakeTransitionPageTwo(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SearchCoursePage.ets", line: 14, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "SearchLongTakeTransitionPageTwo" });
    }
}
class CourseItem extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__course = new SynchedPropertyObjectOneWayPU(params.course, this, "course");
        this.__courseImage = new ObservedPropertyObjectPU(null, this, "courseImage");
        this.__isPressed = new ObservedPropertySimplePU(false, this, "isPressed");
        this.onCourseClick = undefined;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: CourseItem_Params) {
        if (params.courseImage !== undefined) {
            this.courseImage = params.courseImage;
        }
        if (params.isPressed !== undefined) {
            this.isPressed = params.isPressed;
        }
        if (params.onCourseClick !== undefined) {
            this.onCourseClick = params.onCourseClick;
        }
    }
    updateStateVars(params: CourseItem_Params) {
        this.__course.reset(params.course);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__course.purgeDependencyOnElmtId(rmElmtId);
        this.__courseImage.purgeDependencyOnElmtId(rmElmtId);
        this.__isPressed.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__course.aboutToBeDeleted();
        this.__courseImage.aboutToBeDeleted();
        this.__isPressed.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__course.updateElmtId(oldElmtId, newElmtId);
        this.__courseImage.updateElmtId(oldElmtId, newElmtId);
        this.__isPressed.updateElmtId(oldElmtId, newElmtId);
    }
    private __course: SynchedPropertySimpleOneWayPU<ClassInfo>;
    get course() {
        return this.__course.get();
    }
    set course(newValue: ClassInfo) {
        this.__course.set(newValue);
    }
    private __courseImage: ObservedPropertyObjectPU<image.PixelMap | null>;
    get courseImage() {
        return this.__courseImage.get();
    }
    set courseImage(newValue: image.PixelMap | null) {
        this.__courseImage.set(newValue);
    }
    private __isPressed: ObservedPropertySimplePU<boolean>;
    get isPressed() {
        return this.__isPressed.get();
    }
    set isPressed(newValue: boolean) {
        this.__isPressed.set(newValue);
    }
    private onCourseClick?: (course: ClassInfo) => void;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
            Row.width('100%');
            Row.height(68);
            Row.padding({ left: 16, right: 16 });
            Row.scale({ x: this.isPressed ? 0.98 : 1, y: this.isPressed ? 0.98 : 1 });
            globalThis.Context.animation(null);
            Row.onTouch((event: TouchEvent) => {
                if (event.type === TouchType.Down) {
                    this.isPressed = true;
                }
                else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
                    this.isPressed = false;
                }
            });
            Row.onClick(() => {
                if (this.onCourseClick) {
                    this.onCourseClick(ObservedObject.GetRawObject(this.course));
                }
            });
            Row.onAppear(async () => {
                if (this.course.imageURL) {
                    try {
                        this.courseImage = await loginFunction.GetPic(this.course.imageURL) as image.PixelMap;
                    }
                    catch (e) {
                        hilog.error(DOMAIN, TAG, 'Failed to load course image', e);
                    }
                }
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.courseImage) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create(this.courseImage);
                        if (isInitialRender) {
                            Image.draggable(false);
                            Image.width(44);
                            Image.height(44);
                            Image.borderRadius(12);
                            Image.objectFit(ImageFit.Cover);
                        }
                    }, Image);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.backgroundColor({ "id": 125829156, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Column.width(44);
                            Column.height(44);
                            Column.borderRadius(12);
                        }
                    }, Column);
                    Column.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.layoutWeight(1);
                Column.alignItems(HorizontalAlign.Start);
                Column.margin({ left: 12 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.course.name);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(16);
                Text.fontWeight(FontWeight.Medium);
                Text.maxLines(1);
                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            }
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.course.teacherfactor) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`教师: ${this.course.teacherfactor}`);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(13);
                            Text.maxLines(1);
                            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        }
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        Column.pop();
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export default class SearchLongTakeTransitionPageTwo extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.pageInfos = new NavPathStack();
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__allCourses = new ObservedPropertyObjectPU([], this, "allCourses");
        this.__filteredCourses = new ObservedPropertyObjectPU([], this, "filteredCourses");
        this.__isLoading = new ObservedPropertySimplePU(false, this, "isLoading");
        this.__cloneSessionCookies = this.createStorageProp('cloneSessionCookies', '', "cloneSessionCookies");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SearchLongTakeTransitionPageTwo_Params) {
        if (params.pageInfos !== undefined) {
            this.pageInfos = params.pageInfos;
        }
        if (params.searchText !== undefined) {
            this.searchText = params.searchText;
        }
        if (params.allCourses !== undefined) {
            this.allCourses = params.allCourses;
        }
        if (params.filteredCourses !== undefined) {
            this.filteredCourses = params.filteredCourses;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
    }
    updateStateVars(params: SearchLongTakeTransitionPageTwo_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__allCourses.purgeDependencyOnElmtId(rmElmtId);
        this.__filteredCourses.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionCookies.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__searchText.aboutToBeDeleted();
        this.__allCourses.aboutToBeDeleted();
        this.__filteredCourses.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__cloneSessionCookies.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private pageInfos: NavPathStack;
    private __searchText: ObservedPropertySimplePU<string>;
    get searchText() {
        return this.__searchText.get();
    }
    set searchText(newValue: string) {
        this.__searchText.set(newValue);
    }
    private __allCourses: ObservedPropertyObjectPU<ClassInfo[]>;
    get allCourses() {
        return this.__allCourses.get();
    }
    set allCourses(newValue: ClassInfo[]) {
        this.__allCourses.set(newValue);
    }
    private __filteredCourses: ObservedPropertyObjectPU<ClassInfo[]>;
    get filteredCourses() {
        return this.__filteredCourses.get();
    }
    set filteredCourses(newValue: ClassInfo[]) {
        this.__filteredCourses.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __cloneSessionCookies: ObservedPropertyAbstractPU<string>;
    get cloneSessionCookies() {
        return this.__cloneSessionCookies.get();
    }
    set cloneSessionCookies(newValue: string) {
        this.__cloneSessionCookies.set(newValue);
    }
    async aboutToAppear() {
        await this.loadCourses();
    }
    async loadCourses() {
        this.isLoading = true;
        try {
            const dbManager = DatabaseManager.getInstance();
            // 克隆登录时搜索的是克隆用户的课程，课程列表请求走克隆会话
            const cookies = this.cloneSessionCookies !== ''
                ? this.cloneSessionCookies
                : (await dbManager.getUserByPosition(1, true))?.cookies;
            if (cookies) {
                const result = await CourseAndActivity.getClassList(cookies);
                if (result.msg) {
                    this.allCourses = result.classList;
                    this.filteredCourses = result.classList;
                }
                else {
                    promptAction.showToast({ message: '获取课程列表失败', duration: 2000 });
                }
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, 'Failed to load courses', e);
            promptAction.showToast({ message: '加载课程失败', duration: 2000 });
        }
        finally {
            this.isLoading = false;
        }
    }
    handleSearch(value: string) {
        this.searchText = value;
        if (!value) {
            this.filteredCourses = this.allCourses;
        }
        else {
            const searchLower = value.toLowerCase();
            this.filteredCourses = this.allCourses.filter(course => course.name.toLowerCase().includes(searchLower) ||
                (course.teacherfactor && course.teacherfactor.toLowerCase().includes(searchLower)));
        }
    }
    handleCourseClick(course: ClassInfo): void {
        // 返回上一页并传递选中的课程信息
        // 这里可以添加导航到课程详情或签到页面的逻辑
        this.pageInfos.pushPath({ name: 'ActivityListPage', param: course });
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            NavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.size({
                        width: '100%',
                        height: '100%'
                    });
                    Column.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    // 搜索栏
                    Row.create({ space: 12 });
                    // 搜索栏
                    Row.width('100%');
                    // 搜索栏
                    Row.height(64);
                    // 搜索栏
                    Row.alignItems(VerticalAlign.Center);
                    // 搜索栏
                    Row.padding({ left: 16, right: 16, top: 8, bottom: 8 });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width(40);
                    Column.height(40);
                    Column.borderRadius(12);
                    Column.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.justifyContent(FlexAlign.Center);
                    Column.onClick(() => { this.onArrowClicked(); });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(20);
                    Image.height(20);
                    Image.fillColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.rotate({ angle: 180 });
                }, Image);
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Search.create({ placeholder: '搜索课程名称或教师', value: { value: this.searchText, changeEvent: newValue => { this.searchText = newValue; } } });
                    Search.height(40);
                    Search.placeholderColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Search.layoutWeight(1);
                    Search.borderRadius(20);
                    Search.backgroundColor({ "id": 125829156, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Search.geometryTransition('SEARCH_ONE_SHOT_DEMO_TRANSITION_ID');
                    Search.defaultFocus(true);
                    Search.focusOnTouch(true);
                    Search.onSubmit((value: string) => {
                        this.handleSearch(value);
                    });
                    Search.onChange((value: string) => {
                        this.handleSearch(value);
                    });
                }, Search);
                Search.pop();
                // 搜索栏
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    // 搜索结果
                    if (this.isLoading) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.layoutWeight(1);
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                LoadingProgress.create();
                                LoadingProgress.width(48);
                                LoadingProgress.height(48);
                                LoadingProgress.color({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, LoadingProgress);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('加载中...');
                                Text.fontSize(14);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.margin({ top: 12 });
                            }, Text);
                            Text.pop();
                            Column.pop();
                        });
                    }
                    else if (this.filteredCourses.length === 0) {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.layoutWeight(1);
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create({ "id": 16777279, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Image.draggable(false);
                                Image.width(80);
                                Image.height(80);
                                Image.fillColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Image.margin({ bottom: 16 });
                                Image.opacity(0.5);
                            }, Image);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(this.searchText ? '未找到匹配的课程' : '暂无课程');
                                Text.fontSize(16);
                                Text.fontWeight(FontWeight.Medium);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.searchText) {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create('换个关键词试试看');
                                            Text.fontSize(14);
                                            Text.fontColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                            Text.margin({ top: 8 });
                                        }, Text);
                                        Text.pop();
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                    });
                                }
                            }, If);
                            If.pop();
                            Column.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(2, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.layoutWeight(1);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(`找到 ${this.filteredCourses.length} 个课程`);
                                Text.fontSize(14);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.width('100%');
                                Text.padding({ left: 16, right: 16, bottom: 8 });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                List.create({ space: 0 });
                                List.divider({ strokeWidth: 0.5, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, startMargin: 72, endMargin: 16 });
                                List.width('100%');
                                List.layoutWeight(1);
                                List.padding({ left: 0, right: 0 });
                                List.cachedCount(5);
                                List.scrollBar(BarState.Off);
                            }, List);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                ForEach.create();
                                const forEachItemGenFunction = (_item, index: number) => {
                                    const course = _item;
                                    {
                                        const itemCreation = (elmtId, isInitialRender) => {
                                            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                            ListItem.create(deepRenderFunction, true);
                                            if (!isInitialRender) {
                                                ListItem.pop();
                                            }
                                            ViewStackProcessor.StopGetAccessRecording();
                                        };
                                        const itemCreation2 = (elmtId, isInitialRender) => {
                                            ListItem.create(deepRenderFunction, true);
                                        };
                                        const deepRenderFunction = (elmtId, isInitialRender) => {
                                            itemCreation(elmtId, isInitialRender);
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                __Recycle__.create();
                                            }, __Recycle__);
                                            {
                                                this.observeRecycleComponentCreation("CourseItem", (elmtId, isInitialRender, recycleNode = null) => {
                                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                                    if (isInitialRender) {
                                                        let componentCall = recycleNode ? recycleNode : new CourseItem(this, {
                                                            course: course,
                                                            onCourseClick: (c: ClassInfo) => this.handleCourseClick(c)
                                                        }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SearchCoursePage.ets", line: 239, col: 19 });
                                                        ViewPU.createRecycle(componentCall, recycleNode !== null, "CourseItem", () => {
                                                            if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                                                recycleNode.aboutToReuseInternal();
                                                            }
                                                            else {
                                                                if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                                    recycleNode.aboutToReuse({ course: course,
                                                                        onCourseClick: (c: ClassInfo) => this.handleCourseClick(c) });
                                                                }
                                                                recycleNode.rerender();
                                                            }
                                                        });
                                                        let paramsLambda = () => {
                                                            return {
                                                                course: course,
                                                                onCourseClick: (c: ClassInfo) => this.handleCourseClick(c)
                                                            };
                                                        };
                                                        componentCall.paramsGenerator_ = paramsLambda;
                                                    }
                                                    else {
                                                        this.updateStateVarsOfChildByElmtId(elmtId, {
                                                            course: course
                                                        });
                                                    }
                                                    ViewStackProcessor.StopGetAccessRecording();
                                                });
                                            }
                                            __Recycle__.pop();
                                            ListItem.pop();
                                        };
                                        this.observeComponentCreation2(itemCreation2, ListItem);
                                        ListItem.pop();
                                    }
                                };
                                this.forEachUpdateFunction(elmtId, this.filteredCourses, forEachItemGenFunction, undefined, true, false);
                            }, ForEach);
                            ForEach.pop();
                            List.pop();
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
                Column.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/SearchCoursePage" });
            NavDestination.transition(TransitionEffect.OPACITY);
            NavDestination.hideTitleBar(true);
            NavDestination.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            NavDestination.onReady((context: NavDestinationContext) => {
                this.pageInfos = context.pathStack;
            });
            NavDestination.onBackPressed(() => {
                // 返回时也使用动画
                this.getUIContext().animateTo({
                    curve: curves.interpolatingSpring(0, 1, 342, 38)
                }, () => {
                    this.pageInfos.pop(false);
                });
                return true;
            });
        }, NavDestination);
        NavDestination.pop();
    }
    private onArrowClicked(): void {
        this.getUIContext().animateTo({
            curve: curves.interpolatingSpring(0, 1, 342, 38)
        }, () => {
            this.pageInfos.pop(false);
        });
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("SearchCoursePage", wrapBuilder(init));
    }
})();
