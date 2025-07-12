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
        this.writeFiles();
        return await this.runSimulation();
    }

    writeFiles() {
        fs.cpSync(this.tmpDirPHP, this.tmpDir, { recursive: true });
    }

    async runSimulation() {
        const command = `docker run --rm -v gladcode_tmp_run:/usercode -w /usercode/${this.dirname} --cpu-period=100000 --cpu-quota=50000 gladcode2-vm sh socket_compile.sh`;
        // const command = `sh call_socket.sh ${this.dirname}`;
        return new Promise((resolve, reject) => exec(command, { cwd: this.tmpDir }, (error, stdout, stderr) => {
            const response = {}
            if (fs.existsSync(`${this.tmpDir}/errorc.txt`)) {
                // console.log(`Found errorc.txt. Size: ${fs.statSync(`${this.tmpDir}/errorc.txt`).size} bytes`);
                const errorc = fs.readFileSync(`${this.tmpDir}/errorc.txt`, 'utf8');
                // console.log(errorc);
                response.error = errorc;
            }
            if (fs.existsSync(`${this.tmpDir}/simlog`)) {
                // console.log(`Found simlog. Size: ${fs.statSync(`${this.tmpDir}/simlog`).size} bytes`);
                const simlog = fs.readFileSync(`${this.tmpDir}/simlog`, 'utf8');
                // console.log(simlog);
                response.simlog = `[${simlog}]`;
            }
            resolve(response);
            return;
        }));

    }
}

export default Runner;
