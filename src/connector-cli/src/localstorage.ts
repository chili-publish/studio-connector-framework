import path from 'path';
import fs from 'fs';

const home = function (folder: string) {
  var home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  if (!home) {
    throw new Error('Could not find a valid user home path.');
  }
  return path.resolve.apply(
    path.resolve,
    [home].concat(Array.prototype.slice.call(arguments, 0))
  );
};

export class LocalStorage {
  storagePath: any;
  data: { [Key: string]: string };

  constructor(storageName = '.node_local_storage') {
    this.storagePath = path.join(home('.connector-cli'), 'session.json');
    this.data = {};
    this.init();
  }

  init() {
    try {
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      const data = fs.readFileSync(this.storagePath, 'utf8');
      this.data = JSON.parse(data ?? '{}');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // If the file does not exist, initialize it with an empty object
        this.save();
      } else {
        // If there's an error other than file not found, throw it
        throw error;
      }
    }
  }

  save() {
    fs.writeFileSync(
      this.storagePath,
      JSON.stringify(this.data, null, 2),
      'utf8'
    );
  }

  getItem(key: string): any {
    return this.data[key] || null;
  }

  setItem(key: string, value: any) {
    this.data[key] = value;
    this.save();
  }

  removeItem(key: string) {
    delete this.data[key];
    this.save();
  }
}
