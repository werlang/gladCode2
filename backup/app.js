import config from './config.js';
import CloudStorage from './gstorage.js';
import compressFile from './compressor.js';
import mysqldump from 'mysqldump';
import fs from 'fs';

(async () => {
    if (config.gcloudBackup.enabled === false) {
        console.log(`Backup is disabled.`);
        return;
    }
    // if the account file does not exist
    if (!fs.existsSync(`./${config.gcloudBackup.accountFile}`)) {
        console.error(`Account file not found. Please check the account file path.`);
        return;
    }
    
    // configure backup sets
    const backupConfig = {
        dump: {
            // tables: [],
            // excludeTables: true,
            // data: {
            //     maxRowsPerInsertStatement: 10
            // }
        }
    }
    
    console.log(`Backup started.`);
    
    // create a dump of the database
    const backupPath = `./database.sql.gz`;
    console.log(`Creating database dump...`);
    await mysqldump({
        connection: config.mysql,
        dumpToFile: backupPath,
        ...backupConfig,
    });

    // compress the dump
    console.log(`Compressing database dump...`);
    await compressFile(backupPath);

    // new file name (gladcode_backup_yyyy-mm-dd_hh-mm-ss.sql)
    const date = new Date().toISOString().replace(/[:]/g, '-').replace('T', '_').split('.')[0];
    const fileName = `gladcode_backup_${date}.sql.gz`;

    // upload to google cloud storage
    console.log(`Uploading file ${fileName} to google cloud storage...`);

    const storage = new CloudStorage({
        projectId: config.gcloudBackup.projectId,
        keyFilename: `./${config.gcloudBackup.accountFile}`,
    });
    await storage.upload({
        srcFilePath: backupPath,
        bucket: config.gcloudBackup.bucket,
        storageDir: config.gcloudBackup.storageDir,
        fileName
    });

    // remove local file
    fs.unlinkSync(backupPath);

    console.log(`Backup completed`);
})();