import { Storage } from '@google-cloud/storage';

export default class CloudStorage {
    
    constructor({ projectId, keyFilename }) {
        this.storage = new Storage({ projectId, keyFilename });
    }
    
    async upload({ srcFilePath, bucket, storageDir, fileName}) {
        try {
            const gcs = this.storage.bucket(`gs://${bucket}`);
            const storagepath = `${storageDir}/${fileName}`;
    
            const result = await gcs.upload(srcFilePath, {
                destination: storagepath,
                // public: true,
                // metadata: {
                //     contentType: `application/plain`, //application/csv for excel or csv file upload
                // }
            });
            return result[0].metadata.mediaLink;
    
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}