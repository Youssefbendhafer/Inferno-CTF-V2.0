FROM php:8.2-apache

# Change Apache listen port to 8080
RUN sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf

# Enable required Apache modules
RUN a2enmod rewrite

# Put relic.php under DocumentRoot so Apache can serve it as PHP
# (RewriteRule rewrites to a URI, not a filesystem path)
RUN mkdir -p /var/www/html/api/v1
COPY relic.php /var/www/html/api/v1/relic.php

# Static scroll JSONs
RUN mkdir -p /var/www/html/api/v2/codex/scrolls
COPY scrolls/ /var/www/html/api/v2/codex/scrolls/

# Deploy VirtualHost config (sets *:8080 and mod_rewrite rules)
COPY apache.conf /etc/apache2/sites-enabled/000-default.conf

# Relics upload directory and protected tome
RUN mkdir -p /relics && chmod 777 /relics
COPY forbidden-tome.txt /relics/forbidden-tome.txt

EXPOSE 8080

# Hide PHP version from headers
RUN echo "expose_php = Off" >> /usr/local/etc/php/php.ini
