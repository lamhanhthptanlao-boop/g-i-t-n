Write-Host "Đang build dự án Classroom Magic..." -ForegroundColor Cyan
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build thất bại, vui lòng kiểm tra lại lỗi!" -ForegroundColor Red
    exit 1
}

Copy-Item -Path .\dist\index.html -Destination .\dist\404.html -Force
New-Item -ItemType File -Path .\dist\.nojekyll -Force -ErrorAction SilentlyContinue

Write-Host "Đang đẩy lên nhánh gh-pages của GitHub..." -ForegroundColor Cyan
Push-Location dist
git init
git checkout -B gh-pages
git add -A
git commit -m "Deploy production build to GitHub Pages"
git remote add origin https://github.com/lamhanhthptanlao-boop/g-i-t-n.git 2>$null
git push -u origin gh-pages --force
Pop-Location

Write-Host "Triển khai thành công! Link web: https://lamhanhthptanlao-boop.github.io/g-i-t-n/" -ForegroundColor Green
