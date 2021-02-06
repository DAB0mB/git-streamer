import fetch from 'node-fetch';

import config from '../config';
import { pingAwsRegions } from '../util';

class Turn {
  static async create({ region } = {}) {
    if (region == null) {
      const [entry] = await pingAwsRegions();

      region = entry.name;
    }

    const turn = new Turn({ region });

    return turn;
  }

  constructor({ region }) {
    this.region = region;
  }

  async checkIn(ms = config.turnCheckInMs) {
    if (ms >= 0) {
      this.checkInTimeout = setTimeout(async () => {
        await this.checkIn(-1);

        if (this.checkInTimeout != null) {
          this.checkIn(ms);
        }
      }, ms);
    }

    await fetch(`${config.httpServer}/turn/${this.region}/check-in`, {
      method: 'PUT',
    });
  }

  checkOut() {
    clearTimeout(this.checkInTimeout);

    delete this.checkInTimeout;
  }
}

export default Turn;
