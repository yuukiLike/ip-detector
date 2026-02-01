# Unix 哲学：一切皆文件

## 核心理念

```
┌────────────────────────────────────────────────────────┐
│ "一切皆文件" - 统一的抽象接口                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  /dev/null      → 黑洞，丢弃所有输入                    │
│  /dev/random    → 随机数生成器                         │
│  /dev/zero      → 无限零字节流                         │
│  /dev/sda       → 硬盘设备                             │
│  /dev/tty       → 当前终端                             │
│  /proc/cpuinfo  → CPU 信息（虚拟文件）                  │
│  /proc/[pid]/   → 进程信息                             │
│  /sys/          → 内核参数                             │
│  /dev/tcp/...   → 网络连接（Bash）                     │
│                                                        │
│  统一用 open/read/write/close 操作一切                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Unix 哲学原则

1. **做一件事并做好** - 每个程序只做一件事
2. **程序协作** - 程序的输出可以作为另一个程序的输入
3. **文本流** - 使用文本作为通用接口
4. **快速原型** - 尽早构建原型，尽早迭代

---

## 管道命令详解

### 管道基础

```bash
# 管道符 | 将前一个命令的 stdout 连接到后一个命令的 stdin
command1 | command2 | command3
```

### 常用管道命令

#### grep - 文本搜索

```bash
# 基础搜索
grep "error" logfile.txt
grep -i "error" logfile.txt        # 忽略大小写
grep -r "TODO" ./src               # 递归搜索目录
grep -n "pattern" file             # 显示行号
grep -v "exclude" file             # 反向匹配（排除）
grep -E "regex|pattern" file       # 扩展正则
grep -c "pattern" file             # 统计匹配行数
grep -l "pattern" *.txt            # 只显示文件名
grep -A 3 -B 2 "error" log         # 显示前2行后3行上下文

# 实用组合
ps aux | grep nginx                # 查找进程
history | grep "git commit"        # 搜索历史命令
cat /etc/passwd | grep -E "^root"  # 正则匹配
```

#### awk - 文本处理

```bash
# 基础：按列提取
awk '{print $1}' file              # 打印第一列
awk '{print $1, $3}' file          # 打印第一和第三列
awk -F: '{print $1}' /etc/passwd   # 指定分隔符为 :

# 条件过滤
awk '$3 > 100' file                # 第三列大于100的行
awk '/pattern/' file               # 包含 pattern 的行
awk '$1 == "error" {print $2}'     # 条件打印

# 计算
awk '{sum += $1} END {print sum}'  # 求和
awk '{count++} END {print count}'  # 计数
awk '{sum+=$1} END {print sum/NR}' # 平均值

# 实用示例
df -h | awk '{print $1, $5}'       # 磁盘使用率
ps aux | awk '{print $2, $11}'     # PID 和命令
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
# 统计访问最多的 IP
```

#### sed - 流编辑器

```bash
# 替换
sed 's/old/new/' file              # 替换每行第一个
sed 's/old/new/g' file             # 替换所有
sed -i 's/old/new/g' file          # 原地修改文件
sed 's/old/new/gi' file            # 忽略大小写

# 删除
sed '/pattern/d' file              # 删除匹配行
sed '1d' file                      # 删除第一行
sed '$d' file                      # 删除最后一行
sed '1,5d' file                    # 删除1-5行

# 插入/追加
sed '2i\new line' file             # 在第2行前插入
sed '2a\new line' file             # 在第2行后追加

# 实用示例
sed -n '10,20p' file               # 打印10-20行
sed 's/^/prefix_/' file            # 添加前缀
sed 's/$/_suffix/' file            # 添加后缀
```

#### sort & uniq - 排序去重

```bash
# sort
sort file                          # 字典序排序
sort -n file                       # 数字排序
sort -r file                       # 逆序
sort -k 2 file                     # 按第二列排序
sort -t: -k 3 -n /etc/passwd       # 指定分隔符，按第三列数字排序
sort -u file                       # 排序并去重

# uniq（需要先排序）
sort file | uniq                   # 去重
sort file | uniq -c                # 统计重复次数
sort file | uniq -d                # 只显示重复行
sort file | uniq -u                # 只显示唯一行
```

#### xargs - 参数传递

```bash
# 基础用法
echo "file1 file2" | xargs rm      # 删除文件
find . -name "*.log" | xargs rm    # 删除所有 .log 文件

# 控制参数
echo "1 2 3" | xargs -n 1 echo     # 每次传一个参数
find . -name "*.js" | xargs -I {} cp {} ./backup/  # 占位符

# 并行执行
find . -name "*.png" | xargs -P 4 -I {} convert {} {}.jpg  # 4个进程并行
```

#### cut & paste - 列操作

```bash
# cut - 提取列
cut -d: -f1 /etc/passwd            # 提取第一列
cut -d, -f1,3 file.csv             # 提取第1和第3列
cut -c1-10 file                    # 提取前10个字符

# paste - 合并列
paste file1 file2                  # 横向合并
paste -d, file1 file2              # 用逗号分隔
```

#### head & tail - 首尾查看

```bash
head -n 20 file                    # 前20行
tail -n 20 file                    # 后20行
tail -f logfile                    # 实时跟踪
tail -f logfile | grep --line-buffered "error"  # 实时过滤
head -c 1000 file                  # 前1000字节
```

#### wc - 统计

```bash
wc file                            # 行数、单词数、字节数
wc -l file                         # 只统计行数
wc -w file                         # 只统计单词数
wc -c file                         # 只统计字节数
find . -name "*.js" | wc -l        # 统计文件数量
```

#### tr - 字符转换

```bash
echo "hello" | tr 'a-z' 'A-Z'      # 转大写
echo "hello" | tr -d 'l'           # 删除字符
echo "hello   world" | tr -s ' '   # 压缩连续空格
cat file | tr '\n' ' '             # 换行转空格
```

#### tee - 分流

```bash
# 同时输出到屏幕和文件
ls | tee output.txt
ls | tee -a output.txt             # 追加模式

# 中间结果保存
cat log | grep error | tee errors.txt | wc -l
```

---

## 经典管道组合

### 日志分析

```bash
# 统计访问最多的 IP（Top 10）
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# 统计 HTTP 状态码分布
cat access.log | awk '{print $9}' | sort | uniq -c | sort -rn

# 实时监控错误日志
tail -f app.log | grep --line-buffered "ERROR" | while read line; do
  echo "[$(date)] $line"
done

# 统计每小时请求量
cat access.log | awk '{print $4}' | cut -d: -f2 | sort | uniq -c
```

### 代码统计

```bash
# 统计代码行数
find . -name "*.py" | xargs wc -l | tail -1

# 统计各语言代码行数
find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn

# 查找最大的文件
find . -type f -exec ls -la {} \; | sort -k5 -rn | head -10

# 查找包含 TODO 的文件
grep -r "TODO" --include="*.js" . | cut -d: -f1 | sort -u
```

### 系统管理

```bash
# 按内存使用排序进程
ps aux | sort -k4 -rn | head -10

# 查看端口占用
netstat -tlnp | grep LISTEN | awk '{print $4, $7}' | sort

# 磁盘使用 Top 10 目录
du -sh /* 2>/dev/null | sort -rh | head -10

# 查找大文件
find / -type f -size +100M 2>/dev/null | head -20
```

### 文本处理

```bash
# CSV 处理：提取特定列并去重
cat data.csv | cut -d, -f2 | sort -u

# JSON 行处理（配合 jq）
cat data.jsonl | jq -r '.name' | sort | uniq -c

# 批量重命名
ls *.txt | sed 's/.txt$//' | xargs -I {} mv {}.txt {}.md

# 合并多个文件并去重
cat file1.txt file2.txt | sort -u > merged.txt
```

---

## 进程替换与重定向

```bash
# 进程替换 <() - 将命令输出当作文件
diff <(ls dir1) <(ls dir2)         # 比较两个目录
comm <(sort file1) <(sort file2)   # 比较两个文件

# 重定向
command > file                     # stdout 到文件
command 2> file                    # stderr 到文件
command &> file                    # stdout + stderr 到文件
command >> file                    # 追加
command < file                     # 从文件读取 stdin

# Here Document
cat << EOF > config.txt
line 1
line 2
EOF

# Here String
grep "pattern" <<< "search in this string"
```

---

## 现代替代工具

| 经典工具 | 现代替代 | 优势 |
|----------|----------|------|
| grep | ripgrep (rg) | 更快，自动忽略 .gitignore |
| find | fd | 更简洁的语法，更快 |
| cat | bat | 语法高亮，Git 集成 |
| ls | exa/eza | 更好的输出格式，Git 状态 |
| sed/awk | sd | 更简单的替换语法 |
| du | dust | 可视化磁盘使用 |
| top | htop/btop | 更好的交互界面 |
| diff | delta | 语法高亮的 diff |

```bash
# ripgrep 示例
rg "pattern" --type py             # 只搜索 Python 文件
rg "TODO" -g "!node_modules"       # 排除目录

# fd 示例
fd "\.js$"                         # 查找 .js 文件
fd -e py -x python {}              # 找到并执行

# bat 示例
bat --style=numbers,changes file   # 显示行号和 Git 变更
```

---

## 参考资源

- [The Art of Command Line](https://github.com/jlevy/the-art-of-command-line)
- [Linux Command Line](https://linuxcommand.org/)
- [Bash Scripting Guide](https://tldp.org/LDP/abs/html/)
