# 知识导图

zhimind.com [想法介绍](http://blog.zhimind.com/zhimind-entire-solution.html)

我还没搞清楚如何添加 SSL证书，所以~~~https会报是rhcloud.com的证书， openshift是红帽公司的平台。

# 目标

吹牛式描述： 升级版MOOC， 启发式、交互式、个性化、以学生为中心。 记忆芯片存储及提取方式（真吹上天了）

启发式问题， 编写教材方式改变（不一定新）， 可以利用大量人工智能、自然语言处理技术，并能反馈促进发展。

# 模块

1. 思维导图，用于课程或书籍知识的组织
2. 文本（文章），交互式内容或测试或视频或教程
3. 教学管理/统计系统，学生学习效果统计，教师、学生都可用上

## 思维导图

## 文本

## 统计系统

# 框架

## 后台：

基于openshift(免费) + python + flask

打算利用上 google app engine(5G的存储空间), Openshift一个1G，能开3个。

数据库定为 PostgreSQL 9.2 + redis

TODO：

1. 自然语言处理，两个句子比较，启发式问题会有很多填空题，需要比较句子。
2. 数据分析与可视化， 统计学生学习情况，给出报告。

## 前端

1. 思维导图 d3.js 和 Angular.js 只有这里用到
2. Tryregex， 编程练习条件有限，只能这样了
3. markdown-it 进行markdown解析
4. Jquery, Bootstrap
5. Runestone 提示样式， 想过用这个的，结果代码太复杂了，啃不动

## 未来

1. 自然语言处理，两个句子比较，启发式问题会有很多填空题，需要比较句子。
2. 数据分析与可视化， 统计学生学习情况，给出报告。
3. 聊天机器人或虚拟现实形式
4. 知识图谱

另见[Todo.md](https://github.com/sndnyang/zhimind/blob/master/Todo.md)

