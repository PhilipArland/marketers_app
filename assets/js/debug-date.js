// const FAKE = '2026-11-09T10:00:00'; 

// const RealDate = Date;
// const offset = new RealDate(FAKE).getTime() - RealDate.now();

// class FakeDate extends RealDate {
//     constructor(...args) {
//         if (args.length) super(...args);
//         else super(RealDate.now() + offset);
//     }
//     static now() { return RealDate.now() + offset; }
// }
// globalThis.Date = FakeDate;