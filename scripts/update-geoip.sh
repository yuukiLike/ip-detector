#!/bin/bash

# MaxMind GeoLite2 数据库更新脚本
#
# 使用前需要：
# 1. 注册MaxMind账号: https://www.maxmind.com/en/geolite2/signup
# 2. 生成License Key: My Account → Manage License Keys
# 3. 在下方填入你的Account ID和License Key

# ========== 配置区域 ==========
ACCOUNT_ID="${MAXMIND_ACCOUNT_ID:-your_account_id}"
LICENSE_KEY="${MAXMIND_LICENSE_KEY:-your_license_key}"
EDITION_ID="GeoLite2-City"
# ==============================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查配置
if [ "$ACCOUNT_ID" = "your_account_id" ] || [ "$LICENSE_KEY" = "your_license_key" ]; then
    echo -e "${RED}❌ 错误：请先配置MaxMind账号信息${NC}"
    echo ""
    echo "请通过以下方式之一配置："
    echo "1. 设置环境变量："
    echo "   export MAXMIND_ACCOUNT_ID='your_account_id'"
    echo "   export MAXMIND_LICENSE_KEY='your_license_key'"
    echo ""
    echo "2. 直接修改此脚本中的配置区域"
    echo ""
    echo "获取账号信息："
    echo "1. 注册账号: https://www.maxmind.com/en/geolite2/signup"
    echo "2. 生成License Key: My Account → Manage License Keys"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"

echo -e "${YELLOW}📦 正在下载 GeoLite2-City 数据库...${NC}"

# 创建临时目录
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR" || exit 1

# 下载数据库
DOWNLOAD_URL="https://download.maxmind.com/app/geoip_download?edition_id=${EDITION_ID}&license_key=${LICENSE_KEY}&suffix=tar.gz"

if curl -f -L -u "${ACCOUNT_ID}:${LICENSE_KEY}" "$DOWNLOAD_URL" -o GeoLite2-City.tar.gz; then
    echo -e "${GREEN}✅ 下载成功${NC}"
else
    echo -e "${RED}❌ 下载失败，请检查：${NC}"
    echo "1. Account ID和License Key是否正确"
    echo "2. 网络连接是否正常"
    echo "3. License Key是否有效"
    rm -rf "$TMP_DIR"
    exit 1
fi

# 解压
echo -e "${YELLOW}📂 正在解压...${NC}"
tar -xzf GeoLite2-City.tar.gz

# 查找.mmdb文件
MMDB_FILE=$(find . -name "GeoLite2-City.mmdb" -type f)

if [ -z "$MMDB_FILE" ]; then
    echo -e "${RED}❌ 错误：未找到.mmdb文件${NC}"
    rm -rf "$TMP_DIR"
    exit 1
fi

# 移动到data目录
echo -e "${YELLOW}📁 正在安装到 $DATA_DIR ...${NC}"
mkdir -p "$DATA_DIR"
mv "$MMDB_FILE" "$DATA_DIR/GeoLite2-City.mmdb"

# 清理临时文件
cd "$PROJECT_DIR" || exit 1
rm -rf "$TMP_DIR"

# 显示文件信息
FILE_SIZE=$(du -h "$DATA_DIR/GeoLite2-City.mmdb" | cut -f1)
echo ""
echo -e "${GREEN}✅ GeoLite2数据库更新成功！${NC}"
echo -e "   文件位置: $DATA_DIR/GeoLite2-City.mmdb"
echo -e "   文件大小: $FILE_SIZE"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "   - MaxMind每周二更新数据库"
echo "   - 建议设置cron定时任务自动更新"
echo "   - 查询速度: < 1毫秒"
echo "   - 精度: 国家99.5%, 城市70%"
