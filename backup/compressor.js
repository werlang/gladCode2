import zlib from 'zlib';
import fs from 'fs';

export default async function compressFile(filename) {
    const tempFilename = `${filename}.temp`;

    fs.copyFileSync(filename, tempFilename);

    try {
        const read = fs.createReadStream(tempFilename);
        const zip = zlib.createGzip();
        const write = fs.createWriteStream(filename);
        read.pipe(zip).pipe(write);

        const promise = await new Promise((resolve, reject) => {
            write.on('error', err => {
                write.end();
                reject(err);
            });
            write.on('finish', () => resolve());
        });

        if (fs.existsSync(tempFilename)) {
            fs.unlinkSync(tempFilename);
        }

        return promise;
    }
    catch (err) {
        // deleteFile(filename);
        throw err;
    }
}