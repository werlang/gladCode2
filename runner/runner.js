import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

class Runner {
    constructor({ dirname, nglads, codes }) {
        this.dirname = dirname;
        this.tmpDirPHP = path.join('/phppayload', this.dirname);
        this.tmpDir = path.join('/runs', this.dirname);
        this.nglads = nglads;
        this.codes = JSON.parse(codes || '[]');
    }

    async run() {
        // write files
        fs.cpSync(this.tmpDirPHP, this.tmpDir, { recursive: true });
        const response = await this.runSimulation();
        // remove temporary files
        fs.rmSync(this.tmpDir, { recursive: true, force: true });
        fs.rmSync(this.tmpDirPHP, { recursive: true, force: true });

        return response;
    }

    async runSimulation() {
        const command = `docker run --rm --name ${this.dirname} -v gladcode_tmp_run:/usercode -w /usercode/${this.dirname} --cpu-period=100000 --cpu-quota=50000 gladcode2-vm sh socket_compile.sh`;
        let finished = false;
        let timeoutId;

        const promise = new Promise((resolve, reject) => {
            const child = exec(command, { cwd: this.tmpDir }, (error, stdout, stderr) => {
                finished = true;
                clearTimeout(timeoutId);
                const response = {};
                if (fs.existsSync(`${this.tmpDir}/errorc.txt`)) {
                    const errorc = fs.readFileSync(`${this.tmpDir}/errorc.txt`, 'utf8');
                    response.error = errorc;
                }
                if (fs.existsSync(`${this.tmpDir}/simlog`)) {
                    const simlog = fs.readFileSync(`${this.tmpDir}/simlog`, 'utf8');
                    response.simlog = `[${simlog}]`;
                }
                resolve(response);
            });
        });

        timeoutId = setTimeout(() => {
            if (!finished) {
                exec(`docker kill ${this.dirname}`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error killing docker container: ${error}`);
                    }

                    // remove dirs
                    fs.rmSync(this.tmpDir, { recursive: true, force: true });
                    fs.rmSync(this.tmpDirPHP, { recursive: true, force: true });
                });
            }
        }, 30000);

        return promise;

    }
}

export default Runner;
