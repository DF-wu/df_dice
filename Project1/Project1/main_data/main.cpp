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
    * "r" : �}���ɮסA�H�¤�r�覡[Ū��]�C
    * "w" : �}�ҩΫإ��ɮסA�H�¤�r�覡[�g�J]�A�|�Ƽg�������ơC
    * "a" : �}�ҩΫإ��ɮסA�H�¤�r�覡[�g�J]�A�ñN�ɮ׫��в���̫�C
    * "rb" : �P "r" ���H�G�i��(binary)�覡[Ū��]�C
    * "wb" : �P "w" ���H�G�i��(binary)�覡[�g�J]�C
    * "ab" : �P "a" ���H�G�i��(binary)�覡[�g�J]�C
    * "r+" : �P "r" ���P�ɨ㦳[Ū��/�g�J]���v�O
    * "w+" : �P "w" ���P�ɨ㦳[Ū��/�g�J]���v�O
    * "a+" : �P "a" ���P�ɨ㦳[Ū��/�g�J]���v�O
    * "rb+" : �P "rb" ���P�ɨ㦳[Ū��/�g�J]���v�O
    * "wb+" : �P "wb" ���P�ɨ㦳[Ū��/�g�J]���v�O
    * "ab+" : �P "ab" ���P�ɨ㦳[Ū��/�g�J]���v�O�C
    */
    if (fp_out == NULL)
    {
        printf("Idiot creat the file first!\n");
        return 0;
    }

    int counter = 0;
    dice_st *dice = (dice_st *)calloc(1000, sizeof(*dice));

    //on screen display
    printf("���O�p�U�G\n");
    printf("1.������J��l�I�� �ΪŮ�j�} Example: 2 5 6\n");
    printf("2.�Q�n�d�ݫ��O���� �п�J8 8 8\n");
    printf("3.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
    printf("4.�����ɮ׫�~�i�N���v��Ƽg�J�ɮפ�,�����ɮ׫��O��0 0 0\n");
    printf("5.�����{���e�����������ɮסA�_�h�����|��\n");

    //write to buffer of log file
    fprintf(fp_out, "���O�p�U�G\n");
    fprintf(fp_out, "1.������J��l�I�� �ΪŮ�j�} Example:2 5 6\n");
    fprintf(fp_out, "2.�Q�n�d�ݫ��O���� �п�J8 8 8\n");
    fprintf(fp_out, "3.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
    fprintf(fp_out, "4.�����ɮ׫�~�i�N���v��Ƽg�J�ɮפ�,�����ɮ׫��O��0 0 0\n");
    fprintf(fp_out, "5.�����{���e�����������ɮסA�_�h�����|��\n");
    fprintf(fp_out, "�榡��:\n");
    fprintf(fp_out, "�Ǹ� ��l1 ��l2 ��l3\n");

    while (scanf("%d%d%d", &dice[counter].a, &dice[counter].b, &dice[counter].c) != EOF)
    {
        /*
        printf("���O�p�U�G\n");
        printf("1.������J��l�I�� �ΪŮ�j�} Example: 2 5 6\n");
        printf("2.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
        */
        // �P�_����1��6����  �s�έ��k�P�_
        if ((dice[counter].a < 7) && (dice[counter].b < 7) && (dice[counter].c < 7) && ( (dice[counter].a * dice[counter].b * dice[counter].c )!= 0))
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
            printf("���O�p�U�G\n");
            printf("1.������J��l�I�� �ΪŮ�j�} Example:2 5 6\n");
            printf("2.�Q�n�d�ݫ��O���� �п�J8 8 8\n");
            printf("3.�p�G�n�d�ݾ��v���� �п�J7 7 7\n");
            printf("4.�����ɮ׫�~�i�N���v��Ƽg�J�ɮפ�,�����ɮ׫��O��0 0 0\n");
            printf("5.�����{���e�����������ɮסA�_�h�����|��\n");
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
