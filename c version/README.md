# df_dice

玩“三六仔”的時候的紀錄器 沒有做gui. 只能用command line.
用Ｃ寫成

目前只能輸入數字 輸入其他的會無限迴圈 目前想到的解法要大改 有好的都可以跟我說

建置環境 vs code  
編譯器 clang++


This is a recorder to help me remember the log of dice.
I use C to programe it.
It is allowed to input number only.
If you input else charactor,it would get into infinit loop.
I don't have a good idea to modify it,you can share your idea if you have any idea.

I am little lazy to make a english version. If you really need it(i don't think this is so useful),I will make it.



＝＝＝＝＝＝ all the content belowe this line is useless, those content is just help me learn to Markdown. ＝＝＝＝＝＝＝＝




大标题
===================================
大标题一般显示工程名,类似html的<h1><br />
你只要在标题下面跟上=====即可


中标题
-----------------------------------
中标题一般显示重点项,类似html的<h2><br />
你只要在标题下面输入------即可

## 每级标题
用1～6个#加上空格代表没级标题 ，例如：
# 一级标题
## 二级标题
### 三级标题
#### 四级表题
##### 五级标题
###### 六级标题

### 注意!!!下面所有语法的提示我都先用3级小标题提醒了!!!

### 单行文本框
    这是一个单行的文本框,只要两个Tab再输入文字即可

### 多行文本框
    这是一个有多行的文本框
    你可以写入代码等,每行文字只要输入两个Tab再输入文字即可
    这里你可以输入一段代码


### 链接
  [点击这里你可以链接到www.google.com](http://www.google.com)<br />
  [点击这里我你可以链接到我的博客](http://www.dushibaiyu.com)<br />

### 自动链接
只需要把网址或电子邮件用< >包含起来就行，例如: <br />
<http://www.dushibaiyu.com> <br/>
<dushibaiyu@yahoo.com>

### 只是显示图片
![github](http://github.com/unicorn.png "github")

### 想点击某个图片进入一个网页,比如我想点击github的icorn然后再进入www.github.com
  [![image]](http://www.github.com/)
  [image]: http://github.com/github.png "github"

### 文字被些字符包围
> 文字被些字符包围
>
> 只要再文字前面加上>空格即可
>
> 如果你要换行的话,新起一行,输入>空格即可,后面不接文字
> 但> 只能放在行首才有效

### 文字被些字符包围,多重包围
> 文字被些字符包围开始
>
> > 只要再文字前面加上>空格即可
>
>  > > 如果你要换行的话,新起一行,输入>空格即可,后面不接文字
>
> > > > 但> 只能放在行首才有效

### 特殊字符处理
有一些特殊字符如<,#等,只要在特殊字符前面加上转义字符即可<br />
你想换行的话其实可以直接用html标签<br />

### 列表显示
* 用*,+,- 加空格即可
* 这是无序的列表

### 有序列表
1. 直接数字加上英文的点，加空格即可
2. 这是第二个

### 分割线
你可以在一行中用三個或以上的星号、减号、下划线來建立一個分割线，行內不能有其他東西。你也可以在星号中间插入空白。下面每种都可以建立分割线：
* * * *
***
----
____
- - -

### 强调
Markdown使用星号（*）和下划线（_）作为标记强调字词的符号相当与html的<em>，用两个*或_包起來的话，則相当与html的<strong>，例如：
*强调*
_强调_
**更加强调**
__更加强调__

### 代码高亮
用三个（`） 加上语言名字，然后换行输入代码，再代码结束时也用 三个（`）来结束，例如：<br />
```C++
#include <iostream>

int main ()
{
  std::cout << "Hello Word!" << std::endl;
}

```
