@echo off
setlocal DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto folder_error
where py >nul 2>nul
if errorlevel 1 goto try_python
py -3 -B start.py
goto finished
:try_python
where python >nul 2>nul
if errorlevel 1 goto missing_python
python -B start.py
goto finished
:missing_python
echo Python was not found. Install it from https://www.python.org/downloads/
echo Then reopen this launcher. Nothing was installed or connected.
goto finished
:folder_error
echo Could not open the kit folder. Extract the ZIP fully before starting.
pause
exit /b 1
:finished
popd
echo.
pause
