FROM nginx

# Copy a configuration file from the current directory
ADD logger.nginx.conf /etc/nginx/conf.d/

ADD . /opt/ErrorLogger
