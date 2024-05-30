# use-idb-bind

> ! There is already [idb](https://www.npmjs.com/package/idb) included inside
>
> ! only support ESM

React hooks for idb (indexedDB) binding

> 中文说明在下方

## install

`npm install use-idb-bind`

or

`yarn add use-idb-bind`

## Basic Usage

First of all, you need to place the database dependency declaring component **IdbProvider** at the very top of the **aggregation of components that need to use the database**：

```Typescript
function App() {
  return (
    <IdbProvider
      dbName="database name"
      // We need the database version to trigger the upgrade pipeline
      currentVersion="newest data base version"
      // The store name of the database needs to be configured before use
      storeNames={["books", "users"]}
      // The fallback component before the database initialization (optional)
      fallback={<>loading</>}
      // The warning message when the database is blocked or clogged (optional)
      // Generally, it is when multiple tabs are opened but the database is upgraded in a single tab
      alertMessage={{
        blocked: "database was blocked, please close other tabs",
        blocking: "database was blocking, please close other tabs"
      }}
      // Upgrade pipeline (optional)
      pipelines={[
        {
          version: 2,
          async upgrade(db) {
            // When the user's database version is less than 2, the following code will be executed to migrate and upgrade the data
            // eg. upgrading the format of {..., title} to: {..., titleInfo: {title, time}}
            const first = db.transaction("books").store.index(0)
            for await (const cursor of first.iterate()) {
              console.log(cursor.value)
              const data = cursor.value
              if (data.title) {
                const t = data.title
                delete data.title
                await db.put("books", {
                  ...data,
                  titleInfo: {
                    title: t,
                    time: Date.now(),
                  },
                })
              }
            }
          },
        },
      ]}
    >
      {/* ... */}
    </IdbProvider>
  )
}
```

Then, within the internal components of IdbProvider and its hooks, use **useIdb** to obtain the database

```Typescript
function Compo(){
    const db = useIdb()
    const save = (data)=>{
        db.put("xxx", "key", data)
    }
}
```

A more convenient and recommended way to use it is - directly use **useIdbBind** to bind a state

```Typescript
function Compo(){
  const [state,setState] = useState({a:1, b:2})
  useIdbBind("someStore", "key", (data: {a:number})=>{
    // What is read is the written {a}, and note that it is necessary to check for null
    if(data){
      setState(pre=>({...pre, ...data}))
    }
  }, (res)=>{
    // Select {a} from {a, b} and return it and store it in the database
    return {
      a: res.a
    }
  })
}
```

> Many times we don't need to bind all the data in the state to the database (and this way the performance will be even worse)
>
> Because there may be other real-time data in the state
>
> However, currently, when the state changes and it is not during a read transaction, writing will be performed, which may increase the amount of disk writing

# 中文说明

> ! 内部已经包含 [idb](https://www.npmjs.com/package/idb)
>
> ! 仅支持 ESM

idb（indexedDB） 的 React hooks 绑定

## 安装

`npm install use-idb-bind`

或者

`yarn add use-idb-bind`

## 基本使用

首先，你需要将数据库依赖声明组件 **IdbProvider** 放置在**需要使用数据库组件簇**的最**顶部**：

```Typescript
function App() {
  return (
    <IdbProvider
      dbName="database name"
      // 我们需要数据库版本，来触发升级管道
      currentVersion="newest data base version"
      // 数据库的 store 名称需要配置后再使用
      storeNames={["books", "users"]}
      // 数据库初始化前的回退组件 (可选)
      fallback={<>loading</>}
      // 数据库被阻止或阻塞时的警告消息 (可选)
      // 一般是打开了多个标签页却在单独一个标签页中升级数据库
      alertMessage={{
        blocked: "database was blocked, please close other tabs",
        blocking: "database was blocking, please close other tabs"
      }}
      // 升级管道(可选)
      pipelines={[
        {
          version: 2,
          async upgrade(db) {
            // 当用户数据库版本小于 2 时，会执行下面代码迁移升级数据
            // 例如，将 {..., title} 的格式，升级为：{..., titleInfo: {title, time}}
            const first = db.transaction("books").store.index(0)
            for await (const cursor of first.iterate()) {
              console.log(cursor.value)
              const data = cursor.value
              if (data.title) {
                const t = data.title
                delete data.title
                await db.put("books", {
                  ...data,
                  titleInfo: {
                    title: t,
                    time: Date.now(),
                  },
                })
              }
            }
          },
        },
      ]}
    >
      {/* ... */}
    </IdbProvider>
  )
}
```

然后，在 IdbProvider 内部组件和其 hooks 中，使用 **useIdb** 获取数据库

```Typescript
function Compo(){
    const db = useIdb()
    const save = (data)=>{
        db.put("xxx", "key", data)
    }
}
```

更简便和推荐的使用方式是 —— 直接使用 **useIdbBind** 绑定一个 state

```Typescript
function Compo(){
  const [state,setState] = useState({a:1, b:2})
  useIdbBind("someStore", "key", (data: {a:number})=>{
    // 读取的就是写入的 {a}，注意需要判空
    if(data){
      setState(pre=>({...pre, ...data}))
    }
  }, (res)=>{
    // 将 {a,b} 中选择 {a} 返回并存入数据库
    return {
      a: res.a
    }
  })
}
```

> 很多时候我们并不需要将 state 中全部数据绑定到数据库（这样性能也会更差）
>
> 因为 state 中可能还有其他的实时数据
>
> 不过，目前会在 state 变化时，非读取事务时进行写入，可能会加大磁盘写入量
