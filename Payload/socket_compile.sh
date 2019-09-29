#!/bin/bash

i=0
while [ -f /usercode/code$i.c ]; do
	(nice -n 15 gcc -o /usercode/code$i /usercode/code$i.c 2>> /usercode/errorc.txt -lm && nice -n 15 ./usercode/code$i >> head -c 1M /usercode/outputc.txt) &
	i=$((i + 1))
done

#nice -n 15 gcc -o /usercode/gladCodeServerMain /usercode/gladCodeServerMain.c 2>> /usercode/errors.txt -lm -lpthread && nice -n 15 ./usercode/gladCodeServerMain $i >> /usercode/outputs.txt

#any update in main must be recompilled
#gcc -o gladCodeServerMain gladCodeServerMain.c -lm -lpthread

nice -n 15 ./usercode/gladCodeServerMain $i >> /usercode/outputs.txt
