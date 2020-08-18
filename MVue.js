// 解析工具类
const compileUtil = {
    getVal(expr, vm) {
        return expr.split('.').reduce((data, cur) => {
            // 在这里触发函数的getter
            data = data[cur]
            return data
        }, vm.$data)
    },
    setVal(expr, vm, inputVal) {
        // 'person.age'
        return expr.split('.').reduce((data, cur,index,arr) => {
            // 在这里触发函数的getter 一个不断赋值的操作
            if (index == arr.length - 1) {
                data[cur] = inputVal;
            }
            return data[cur]
        }, vm.$data)
    },
    getContentVal(expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            return this.getVal(args[1], vm)
        })
    },
    text(node, expr = '', vm) {// 处理 <div v-text='person.fav'></div> {{person.name}} - {{person.age}}
        let value;
        if (String.prototype.includes.call(expr, '{{')) { // {{person.name}} - {{person.age}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                new Watcher(vm, args[1], (newVal) => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm))
                })
                return this.getVal(args[1], vm)
            })
        } else {
            value = this.getVal(expr, vm);
        }
        this.updater.textUpdater(node, value)

    },
    html(node, expr, vm) {
        const value = this.getVal(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value)
    },
    model(node, expr, vm) {
        const value = this.getVal(expr, vm)
        // 绑定更新函数
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })
        // 视图 =》 数据 =》 视图
        node.addEventListener('input', (e) => {
            // 设置值
            this.setVal(expr, vm, e.target.value)
        })
        this.updater.modelUpdater(node, value)
    },
    on(node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false)
    },
    // 更新的函数
    updater: {
        modelUpdater(node, value) {
            node.value = value
        },
        textUpdater(node, value) {
            node.textContent = value
        },
        htmlUpdater(node, value) {
            node.innerHTML = value
        },
        model(node, expr, vm) {

        }
    }
}

// 模版编译
class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm

        //1. 获取文档碎片对象 放入内存中会减少回流和重绘
        const fragment = this.node2Fragment(this.el)
        //2. 编译模版
        this.compile(fragment)
        //3. 追加子元素到跟节点
        this.el.appendChild(fragment)
    }
    compile(fragment) {
        // 1.获取子节点
        const childNodes = fragment.childNodes;

        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                // 是元素节点
                this.compileElement(child)
            } else {
                // 文本节点
                this.compileText(child)
            }

            // 递归遍历 
            if (child.childNodes && child.childNodes.length) {
                this.compile(child)
            }
        })
    }
    compileElement(node) {
        // 编译元素 <div v-html="text"></html>
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const { name, value } = attr

            if (this.isDirective(name)) { // 是一个指令 v-text v-html v-on:click
                const [, directive] = name.split('-');
                const [dirName, eventName] = directive.split(':');

                // 更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName)

                // 删除有指令的标签上的属性
                node.removeAttribute(name)
            } else if (this.isEventName(name)) {
                // @click='handleClick'
                let [, eventName] = name.split('@');
                compileUtil['on'](node, value, this.vm, eventName)
            }
        })
    }
    compileText(node) {
        const content = node.textContent;

        if (/\{\{(.+?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
    }
    node2Fragment(el) {
        const f = document.createDocumentFragment();
        while (el.firstChild) {
            f.appendChild(el.firstChild)
        }
        return f
    }
    isDirective(name) {
        return String.prototype.startsWith.call(name, 'v-')
    }
    isEventName(name) {
        return String.prototype.startsWith.call(name, '@')
    }
    isElementNode(node) {
        return node.nodeType === 1
    }

}

class MVue {
    constructor(options) {
        this.$el = options.el
        this.$data = options.data
        this.$options = options

        if (this.$el) {
            // 1. 实现一个数据观察者
            new Observer(this.$data)
            // 2. 实现一个指令解析器
            new Compile(this.$el, this)
            // 3. 实现代理
            this.proxyDataa(this.$data)
        }
    }
    proxyDataa(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}