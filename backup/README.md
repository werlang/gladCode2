# Backup Instructions

This folder contains scripts to perform backups of the database. It will automatically compress the database and upload it to google cloud storage.

## Requirements

- Have a google cloud storage bucket. Instructions for this are beyond the scope of this document.
- Have a google service account with admin access to the bucket. Instructions for this are beyond the scope of this document.
- Copy the json file from your service account to this folder and reference it in the `config.js` file under the `gcloudBackup.accountFile` key.

## Usage

Create a cron job to run the backup script at regular intervals. First, open the crontab file with the following command:

```bash
crontab -e
```

Then add the following line to the file:

```bash
0 0 * * * docker compose -f /home/gladcode/backup/compose.yaml run --rm backup
```

This will run the backup script every day at midnight.