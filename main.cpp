#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct
{
    int a;
    int b;
    int c;
    int d; //useless
} dice_st;

//useless now
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
    int i;
    FILE *fp_out;
    fp_out = fopen("dice_log.txt", "w");
    /* Mod:
    * "r" : 開啟檔案，以純文字方式[讀取]。
    * "w" : 開啟或建立檔案，以純文字方式[寫入]，會複寫原先的資料。
    * "a" : 開啟或建立檔案，以純文字方式[寫入]，並將檔案指標移到最後。
    * "rb" : 同 "r" 但以二進位(binary)方式[讀取]。
    * "wb" : 同 "w" 但以二進位(binary)方式[寫入]。
    * "ab" : 同 "a" 但以二進位(binary)方式[寫入]。
    * "r+" : 同 "r" 但同時具有[讀取/寫入]的權力
    * "w+" : 同 "w" 但同時具有[讀取/寫入]的權力
    * "a+" : 同 "a" 但同時具有[讀取/寫入]的權力
    * "rb+" : 同 "rb" 但同時具有[讀取/寫入]的權力
    * "wb+" : 同 "wb" 但同時具有[讀取/寫入]的權力
    * "ab+" : 同 "ab" 但同時具有[讀取/寫入]的權力。
    */
    if (fp_out == NULL)
    {
        printf("moteher fucker creat the file first!\n");
        return 0;
    }

    int counter = 1;
    dice_st *dice = (dice_st *)calloc(1000, sizeof(*dice));

    //on screen display
    printf("指令如下：\n");
    printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
    printf("2.想要查看指令的話 請輸入8 8 8\n");
    printf("3.如果要查看歷史紀錄 請輸入7 7 7\n");
    printf("4.關閉檔案後才可將歷史資料寫入檔案內,關閉檔案指令為0 0 0\n");
    printf("5.關閉程式前必須先關閉檔案，否則紀錄會遺失\n");

    //write to buffer of log file
    fprintf(fp_out, "指令如下：\n");
    fprintf(fp_out, "1.直接輸入骰子點數 用空格隔開 Example:2 5 6\n");
    fprintf(fp_out, "2.想要查看指令的話 請輸入8 8 8\n");
    fprintf(fp_out, "3.如果要查看歷史紀錄 請輸入7 7 7\n");
    fprintf(fp_out, "4.關閉檔案後才可將歷史資料寫入檔案內,關閉檔案指令為0 0 0\n");
    fprintf(fp_out, "5.關閉程式前必須先關閉檔案，否則紀錄會遺失\n");
    fprintf(fp_out, "格式為:\n");
    fprintf(fp_out, "序號 骰子1 骰子2 骰子3\n");

    while (scanf("%d%d%d", &dice[counter].a, &dice[counter].b, &dice[counter].c) != EOF)
    {
        /*
        printf("指令如下：\n");
        printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
        printf("2.如果要查看歷史紀錄 請輸入7 7 7\n");
        */
        // 判斷介於1到6之間  零用乘法判斷
        if ((dice[counter].a < 7) && (dice[counter].b < 7) && (dice[counter].c < 7) && (dice[counter].a * dice[counter].b * dice[counter].c != 0))
        { //write into log file
            fprintf(fp_out, "第%d個：%d %d %d\n", counter, dice[counter].a, dice[counter].b, dice[counter].c);
            counter++;
        }

        else if ((dice[counter].a == 7) && (dice[counter].b == 7) && (dice[counter].c == 7))
        {
            printf("歷史紀錄:\n");
            for (i = 0; i < counter; i++)
            {

                printf("第%d個是 %d %d %d\n", i + 1, dice[i].a, dice[i].b, dice[i].c);
            }
        }
        else if ((dice[counter].a == 8) && (dice[counter].b == 8) && (dice[counter].c == 8))
        {
            printf("指令如下：\n");
            printf("1.直接輸入骰子點數 用空格隔開 Example:2 5 6\n");
            printf("2.想要查看指令的話 請輸入8 8 8\n");
            printf("3.如果要查看歷史紀錄 請輸入7 7 7\n");
            printf("4.關閉檔案後才可將歷史資料寫入檔案內,關閉檔案指令為0 0 0\n");
            printf("5.關閉程式前必須先關閉檔案，否則紀錄會遺失\n");
        }
        else if ((dice[counter].a == 0) && (dice[counter].b == 0) && (dice[counter].c == 0))
        {
            printf("檔案完成寫入\n");
            return 0;
        }
        else
        {
            printf("輸入錯誤 重新輸入\n");
        }
    }
    printf("可關閉程式\n");
}
