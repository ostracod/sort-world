
echo "Restarting..."

pkill -f "node sortWorld.js"
NODE_ENV="production" nohup node sortWorld.js > serverMessages.txt 2>&1 &


