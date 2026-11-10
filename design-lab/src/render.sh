#!/bin/bash
D=$1; mkdir -p ../$D; for s in home feed market profile callit calledit; do node shot.js "file://$PWD/lab.html?d=$D&s=$s" ../$D/$s.png 390 844 & done; wait
