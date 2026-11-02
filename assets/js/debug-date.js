// TEMPORARY: fake the current date for testing. Delete this file when done.
const FAKE = '2026-11-02T10:00:00';   // change this to test other days

const RealDate = Date;
const offset = new RealDate(FAKE).getTime() - RealDate.now();

class FakeDate extends RealDate {
    constructor(...args) {
        if (args.length) super(...args);
        else super(RealDate.now() + offset);   // clock keeps ticking from the fake start
    }
    static now() { return RealDate.now() + offset; }
}
globalThis.Date = FakeDate;