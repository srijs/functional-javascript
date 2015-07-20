'use strict';

//---

let Next = function (value, done) {
  this.value = value;
  this.done = done;
};

Next.fromNext = function (next) {
  return new Next(next.value, next.done);
};

Next.of = function (value) {
  return new Next(value, false);
};

Next.prototype.map = function (f) {
  return new Next(f(this.value), this.done);
};

Next.prototype.ap = function (b) {
  return new Next(this.value(b.value), b.done);
};

//---

let Writer = function (w, a) {
  if (!(this instanceof Writer)) {
    return new Writer(w, a);
  }
  this.w = w;
  this.a = a;
};

// Writer w a -> w -> Writer w a
Writer.prototype.tell = function (w) {
  return Writer(w);
};

// Writer w a -> b -> Writer w b
Writer.prototype.of = function (a) {
  return Writer(this.w.empty(), a);
};

// Writer w a -> (a -> b) -> Writer w b
Writer.prototype.map = function (f) {
  return Writer(this.w, f(this.a));
};

// Writer w a -> (a -> Writer w b) -> Writer w b
Writer.prototype.chain = function (f) {
  let writer = f(this.a);
  return new Writer(this.w.concat(writer.w), writer.a);
};

// Writer w (Next a) -> Next (Writer w a)
Writer.prototype.sequenceNext = function () {
  return new Next(
    new Writer(this.w, this.a.value),
    this.a.done
  );
};

//---

let Log = function (log) {
  if (!(this instanceof Log)) {
    return new Log(log);
  }
  this.log = log;
};

Log.prototype.empty = function () {
  return Log([]);
};

Log.prototype.concat = function (log) {
  return Log(this.log.concat(log.log));
};

//---

let run = function (gen, of) {
  let running = function *() {
    return of(yield *gen());
  }();
  let next = Next.of(of(null));
  while (!next.done) {
    next = next.value.map(function (a) {
      return Next.fromNext(running.next(a));
    }).sequenceNext().map(function (a) {
      return a.chain(function (a) { return a; });
    });
  }
  return next.value;
};

//---

let LogWriter = Writer(Log());

let warn = function* (message) {
  yield LogWriter.tell(Log([{level: 'warn', message: message}]));
};

let info = function* (message) {
  yield LogWriter.tell(Log([{level: 'info', message: message}]));
};

//--

let hello = function* (v) {
  yield* info('hello ' + v);
  return v + 1;
};

let log = function* () {
  let v = yield LogWriter.of(42);
  let w = yield* hello(v);
  let x = yield* hello(w);
  let y = yield* hello(x);
  let z = yield* hello(y);
  yield* warn('all done');
  return z;
};

var countdown = function* (n) {
  yield* info('hello ' + n);
  if (n > 0) {
    yield* countdown(n - 1);
  } else {
    return n;
  }
};

var countdown42 = function *() {
  yield *countdown(42);
  return 100;
};

var writer = run(countdown42, LogWriter.of.bind(LogWriter));
console.log(JSON.stringify(writer, null, 2));
