#!/bin/bash

# Get total free memory in MB
total_free_memory=$(free -m | awk '/^Mem:/{print $7}')
# Calculate 80% of free memory
memory_limit=$(echo "$total_free_memory * 0.7" | bc | awk '{print int($1+0.5)}')
# Start the NestJS application with the calculated memory limit
node --max-old-space-size=$memory_limit dist/main.js