FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# 24 | Palitan ng ganito:
COPY php/www.conf /usr/local/etc/php-fpm.d/www.conf

# 26 | Palitan ng ganito:
COPY php/opcache.ini /usr/local/etc/php.ini-production

# 1. Kopyahin muna ang dependency files
COPY composer.json composer.lock ./

# 2. Install dependencies (Cached layer)
RUN composer install --no-scripts --no-autoloader --no-dev

# 3. Kopyahin ang buong project files
COPY . .

# 4. Tapusin ang autoload optimization
RUN composer dump-autoload --optimize

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www/storage \
    && chmod -R 775 /var/www/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]