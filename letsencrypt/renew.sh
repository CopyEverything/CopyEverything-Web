sudo service apache2 stop
sudo forever stopall

letsencrypt certonly --standalone ~/letsencrypt/etc --agree-tos --domains copyeverything.tk www.copyeverything.tk --email copyeverythingapp@gmail.com
letsencrypt certonly --standalone ~/letsencrypt/etc --agree-tos --domains copyeverythingapp.com --email copyeverythingapp@gmail.com
letsencrypt certonly --standalone ~/letsencrypt/etc --agree-tos --domains www.copyeverythingapp.com --email copyeverythingapp@gmail.com

cd ~/copyeverything
sudo forever start server.js
