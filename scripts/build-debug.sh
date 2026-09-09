#!/bin/bash
# Build debug hap (called by AI session; matches AGENTS.md build command)
cd /e/deveco/chaoxingsignfaker-for-harmony-OS-NEXT || exit 1
export DEVECO_SDK_HOME='D:\OtherApp\DevEco Studio\sdk'
cmd //c 'call "D:\OtherApp\DevEco Studio\tools\hvigor\bin\hvigorw.bat" --mode module -p module=entry@default -p product=default -p buildMode=debug assembleHap'
