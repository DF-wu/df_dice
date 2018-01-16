#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int i = 0;

typedef struct
{
    int a;
    int b;
    int c;
    int d; //useless
} dice_st;

void Delete(int counter, int target)
{
    int after_target_remaining = 0;

    after_target_remaining = counter - (target);
}
// df proj test
// test 2

// test 3dd

int main()
{
    FILE *fp;
    fp = fopen("dice_log.txt", "r");

    if (fp == NULL)
    {
        printf("moteher fucker creat the file first!\n");
        return 0;
    }

    int counter = 1;
    dice_st *dice = (dice_st *)calloc(1000, sizeof(*dice));

    //on screen display
    printf("指令如下：\n");
    printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
    printf("2.如果要查看歷史紀錄 請輸入7 7 7\n");
    
    //write to buffer of log file
    fprintf(fp,"指令如下：\n");
    fprintf(fp,"1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
    fprintf(fp,"2.如果要查看歷史紀錄 請輸入7 7 7\n");


    
    while (scanf("%d%d%d", &dice[counter].a, &dice[counter].b, &dice[counter].c) != EOF)
    {
        /*
        printf("指令如下：\n");
        printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
        printf("2.如果要查看歷史紀錄 請輸入7 7 7\n");
        */

        if ((dice[counter].a < 7) && (dice[counter].b < 7) && (dice[counter].c < 7))
        {   //write into log file
            fprintf(fp,"第%d個 %d %d %d\n",counter,dice[counter].a,dice[counter].b,dice[counter].c);
            counter++;
        }

        else if ((dice[counter].a == 7) && (dice[counter].b == 7) && (dice[counter].c == 7))
        {
            printf("歷史紀錄:\n");
            for (i = 0; i < counter; i++)
            {

                printf("第%d個是 %d %d %d\n", i + 1, dice[counter].a, dice[counter].b, dice[counter].c);
            }
        }
        else
        {
            printf("輸入錯誤 重新輸入\n");
        }
    }
}
