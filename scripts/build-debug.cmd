@echo off
rem Build debug hap (matches AGENTS.md build command); used by AI session
call "D:\OtherApp\DevEco Studio\tools\hvigor\bin\hvigorw.bat" --mode module -p module=entry@default -p product=default -p buildMode=debug assembleHap
