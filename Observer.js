class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        this.oldVal = this.getOldVal();
    }
    getOldVal() {
        Dep.target = this;
        // compileUtil.getVal('person.name', vm)
        const oldVal = compileUtil.getVal(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }
    update() {
        const newVal = compileUtil.getVal(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }

}
class Dep {
    constructor() {
        this.subs = []
    }
    addSub(watcher) {
        this.subs.push(watcher)
    }
    notify() {
        this.subs.forEach(w => w.update())
    }
}

class Observer {
    constructor(data) {
        this.observe(data)
    }
    // 数据劫持
    observe(data) {
        //如果是对象就遍历
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive(obj, key, value) {
        this.observe(value)
        // 通过闭包来实现Dep
        const dep = new Dep()
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: false,
            get() {
                // 订阅数据变化时，往Dep中添加观察者
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                // 设置新的值
                this.observe(newVal)
                if (newVal !== value) {
                    value = newVal
                }
                dep.notify()
            }
        })
    }

}