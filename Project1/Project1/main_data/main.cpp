#define _CRT_SECURE_NO_WARNINGS
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

void Show_Introduction(void)
{
    printf("���O�p�U�G\n");
    printf("1.������J��l�I�� �ΪŮ�j�} Example: 2 5 6\n");
    printf("2.�Q�n�d�ݫ��O���� �п�J8 8 8\n");
    printf("3.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
    printf("4.�����ɮ׫�~�i�N���v��Ƽg�J�ɮפ�,�����ɮ׫��O��0 0 0\n");
    printf("5.�����{���e�����������ɮסA�_�h�����|��\n");
}

void Write_to_File(FILE *fp_out)
{
    fprintf(fp_out, "���O�p�U�G\n");
    fprintf(fp_out, "1.������J��l�I�� �ΪŮ�j�} Example:2 5 6\n");
    fprintf(fp_out, "2.�Q�n�d�ݫ��O���� �п�J8 8 8\n");
    fprintf(fp_out, "3.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
    fprintf(fp_out, "4.�����ɮ׫�~�i�N���v��Ƽg�J�ɮפ�,�����ɮ׫��O��0 0 0\n");
    fprintf(fp_out, "5.�����{���e�����������ɮסA�_�h�����|��\n");
    fprintf(fp_out, "�榡��:\n");
    fprintf(fp_out, "�Ǹ� ��l1 ��l2 ��l3\n");

}

//useless now
void Delete(int counter, int target)
{
    int after_target_remaining = 0;

    after_target_remaining = counter - (target);
}


int main()
{
    int i;
    FILE *fp_in;
    FILE *fp_out;
    fp_in  = fopen("dice_log.txt", "r");
    fp_out = fopen("dice_log.txt", "w");
    char *read_buffer;
    
    if (fp_out == NULL)
    {
        printf("Idiot,creat dice_log.txt first!\n");
        return 0;
    }

    if (fp_in == NULL)
    {
        printf("�S���s�b�O���ɡA�إ߷s�ɮ�\n");
    }
    else
    {   /*���Ln��Ū��  ref:https://zhidao.baidu.com/question/357349762.html */
        for (i = 0; i < 6; i++)
        {
            fscanf(fp_in, "%*[^\n]%*c");  //���Ln��
        }

    }

    

    int counter = 0;
    dice_st *dice = (dice_st *)calloc(1000, sizeof(*dice));

    //on screen display
    Show_Introduction();

    //write the buffer of log to file
    Write_to_File(fp_out);

    while (scanf("%d%d%d", &dice[counter].a, &dice[counter].b, &dice[counter].c) != EOF)
    {

        // �P�_����1��6����  �s�έ��k�P�_
        if ((dice[counter].a < 7) && (dice[counter].b < 7) && (dice[counter].c < 7) && ((dice[counter].a * dice[counter].b * dice[counter].c) != 0))
        { //write into log file
            fprintf(fp_out, "��%d�ӡG%d %d %d\n", counter, dice[counter].a, dice[counter].b, dice[counter].c);
            counter++;
        }

        else if ((dice[counter].a == 7) && (dice[counter].b == 7) && (dice[counter].c == 7))
        {
            printf("���v����:\n");
            for (i = 0; i < counter; i++)
            {

                printf("��%d�ӬO %d %d %d\n", i + 1, dice[i].a, dice[i].b, dice[i].c);
            }
        }
        else if ((dice[counter].a == 8) && (dice[counter].b == 8) && (dice[counter].c == 8))
        {
            Show_Introduction();
        }
        else if ((dice[counter].a == 0) && (dice[counter].b == 0) && (dice[counter].c == 0))
        {
            printf("�ɮק����g�J\n");
            return 0;
        }
        else
        {
            printf("��J���~ ���s��J\n");
        }
    }
    printf("�i�����{��\n");
}
