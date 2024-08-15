#!/bin/bash
node . &
API_PID=$!

node web-frontend/dist/server/entry.mjs &
FRONTEND_PID=$!

# Wait for either process to exit
wait $API_PID $FRONTEND_PID

# Exit with status code of process that first exited
exit $?