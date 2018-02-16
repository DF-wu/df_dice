#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct
{
    int a;
    int b;
    int c;
    int sum; //總和
} dice_st;


char *BigOrSmall(int n, char *str)
{
    if (n > 10)
    {
        str = { "大" };
    }
    else
    {
        str = { "小" };
    }
    return str;
}

void Show_Introduction(void)
{
    printf("指令如下：\n");
    printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
    printf("2.想要查看指令的話 請輸入8 8 8\n");
    printf("3.如果要查看歷史紀錄 請輸入7 7 7\n");
    printf("4.關閉檔案後才可將歷史資料寫入檔案內,關閉檔案指令為0 0 0\n");
    printf("5.關閉程式前必須先關閉檔案，否則紀錄會遺失\n關閉程式前必須先關閉檔案，否則紀錄會遺失\n關閉程式前必須先關閉檔案，否則紀錄會遺失\n很重要 所以說三次\n");
    //5. 有4個\n
}

void Write_Introduction_to_File(FILE *fp_out)
{
    fprintf(fp_out, "指令如下：\n");
    fprintf(fp_out, "1.直接輸入骰子點數 用空格隔開 Example:2 5 6\n");
    fprintf(fp_out, "2.想要查看指令的話 請輸入8 8 8\n");
    fprintf(fp_out, "3.如果要查看歷史紀錄 請輸入7 7 7\n");
    fprintf(fp_out, "4.關閉檔案後才可將歷史資料寫入檔案內,關閉檔案指令為0 0 0\n");
    fprintf(fp_out, "5.關閉程式前必須先關閉檔案，否則紀錄會遺失\n");
    fprintf(fp_out, "格式為:\n");
    fprintf(fp_out, "序號 骰子1 骰子2 骰子3\n");
}

void Write_records_into_Buffer(int counter, dice_st dice)
{
}

//useless now
void Delete(int counter, int target)
{
    int after_target_remaining = 0;

    after_target_remaining = counter - (target);
}

int main()
{
    /*
    char *str = {"123"};
    printf("%s\n",BigOrSmall(9, str));
    */

    int i;
    FILE *fp_in;
    FILE *fp_out;
    /*要做讀取檔案的指標*/
    // fp_in = fopen("dice_log.txt", "r"); 
    //
    fp_out = fopen("dice_log.txt", "w");
    
    char *read_buffer;

    if (fp_out == NULL)
    {
        printf("Idiot,Creating dice_log.txt First!\n");
        return 0;
    }

    //未完工
    /*
    if (fp_in == NULL)
    {
        printf("沒有存在記錄檔，建立新檔案\n");
    }
    else
    {   // 跳過n行讀取                       ref:https://zhidao.baidu.com/question/357349762.html
        for (i = 0; i < 6; i++)
        {
            fscanf(fp_in, "%*[^\n]%*c");  //跳過n行
        }

    }
    */

    //test



    int counter = 0;
    char *str_BigSmall = { "零" };  //存大小 字元的

    dice_st *dice = (dice_st *)calloc(1000, sizeof(*dice));

    //on screen display
    Show_Introduction();

    //write the buffer of log to file
    Write_Introduction_to_File(fp_out);

    while (scanf("%d%d%d", &dice[counter].a, &dice[counter].b, &dice[counter].c) != EOF)
    {   
        dice[counter].sum = dice[counter].a + dice[counter].b + dice[counter].c;

        // 判斷介於1到6之間  零用乘法判斷
        if ((dice[counter].a < 7) && (dice[counter].b < 7) && (dice[counter].c < 7) && ((dice[counter].a * dice[counter].b * dice[counter].c) != 0))
        { //write into log file
            fprintf(fp_out, "第%d個：%d %d %d 總合為%2d %s\n", counter + 1, dice[counter].a, dice[counter].b, dice[counter].c, dice[counter].sum, BigOrSmall(dice[counter].sum, str_BigSmall));
    
            //show on screen
            printf("第%d個：%d %d %d 總合為%2d %s\n", counter + 1, dice[counter].a, dice[counter].b, dice[counter].c, dice[counter].sum, BigOrSmall(dice[counter].sum, str_BigSmall));

            counter++;
        }
        else if ((dice[counter].a == 7) && (dice[counter].b == 7) && (dice[counter].c == 7))
        {
            printf("歷史紀錄:\n");
            for (i = 0; i < counter; i++)
            {
                printf("第%d個：%d %d %d 總合%2d %s\n", i + 1, dice[i].a, dice[i].b, dice[i].c, dice[i].sum, BigOrSmall(dice[counter].sum, str_BigSmall));
            }
        }
        else if ((dice[counter].a == 8) && (dice[counter].b == 8) && (dice[counter].c == 8))
        {
            Show_Introduction();
        }
        else if ((dice[counter].a == 0) && (dice[counter].b == 0) && (dice[counter].c == 0))
        {
            fclose(fp_out);
            printf("檔案完成寫入\n");
            printf("可關閉程式\n");
        }
        else
        {
            printf("輸入錯誤 重新輸入\n");
        }
    }
    
}
