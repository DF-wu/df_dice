#include <stdio.h>
#include <stdlib.h>
#include <string.h>


int arr[9999][3] ;
int counter = 1;
int i=0;

 struct dice_st
{
    int a;
    int b;
    int c;
    int d;  //useless
};

void Delete(int target)
{
    int after_target_remaining = 0 ;
    
    after_target_remaining = counter - (target) ;
    
}
// df proj test
// test 2

// test 3


int main()
{
    struct dice_st  dice;
    
    printf("指令如下：\n");
    printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
    printf("2.如果要查看歷史紀錄 請輸入7 7 7\n");
    
    while( scanf("%d%d%d",&dice.a,&dice.b,&dice.c) != EOF )
    {
        printf("指令如下：\n");
        printf("1.直接輸入骰子點數 用空格隔開 Example: 2 5 6\n");
        printf("2.如果要查看歷史紀錄 請輸入7 7 7\n");
        
        
        
        if( (dice.a < 7) && (dice.b < 7) && (dice.c <7) )
        {
            arr[counter][0] = dice.a;
            arr[counter][1] = dice.b;
            arr[counter][2] = dice.c;
            counter++;
        }
        
        
        else if( (dice.a == 7) && (dice.b == 7) && (dice.c == 7) )
        {
            printf("history\n");
            for(i=0; i<counter; i++)
            {
                
                printf("第%d個是 %d %d %d\n",i+1,arr[i][0],arr[i][1],arr[i][2]);
                
            }
        }
        
        else
        {
            printf("輸入錯誤 重新輸入\n");
        }
        
        
    }
    
    
    
    
}

