
@echo off
cd /d "%~dp0"

"%~dp0venv\Scripts\python.exe" "%~dp0manage.py" check_overdue_reports >> "%~dp0overdue_checker.log" 2>&1
