export default {
    gcloudBackup: {
        enabled: process.env.NODE_ENV === 'production',
        bucket: 'gladcode',
        storageDir: 'database_backup',
        projectId: 'gladcode',
        accountFile: 'gcloud_config.json',
    },
    mysql: {
        host: 'mysql',
        user: 'root',
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: 3306,
    },
}