#!/bin/bash

i=0
while [ -f code$i.* ]; do
	# compile and run C file
	if [ -f code$i.c ]; then
		(gcc -o code$i code$i.c 2>> errorc.txt -lm && ./code$i) &
	fi

	# compile and run Python file
	if [ -f code$i.py ]; then
		(python3 code$i.py 2>> errorc.txt) &
	fi

	# run JavaScript file (gladCodeCore.js runs the gladiator's setup and loop)
	if [ -f code$i.js ]; then
		# Report syntax errors before the engine starts; a background process may not have
		# written stderr yet when the engine checks the shared error file.
		if node --check code$i.js 2>> errorc.txt; then
			(node --no-warnings gladCodeCore.js code$i.js 2>> errorc.txt) &
		fi
	fi
	i=$((i + 1))
done

# "sandbox" (passado pelo runner so em execucoes do editor) libera setHp, setPosition, setAp, lvlUp e slots -1
# "noitems" (passado pelo runner em torneios) desabilita o uso de itens consumiveis
mode=""
for arg in "$@"; do
	if [ "$arg" = "sandbox" ] || [ "$arg" = "noitems" ]; then
		mode="$mode $arg"
	fi
done

gcc -o gladCodeServerMain gladCodeServerMain.c -lm -lpthread && ./gladCodeServerMain $i $mode
