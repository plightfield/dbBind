import {
  type PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
} from "react"
import { type IDBPDatabase, openDB } from "idb"

const DbContext = createContext(null as unknown as IDBPDatabase<any>)

/**
 * get the database instance of idb
 *
 * You can use db to do any operation that idb supports
 *
 * 获取 idb 的数据库实例
 *
 * 您可以使用 db 执行 idb 支持的任何操作
 *
 * @export
 * @return {*}
 */
export function useIdb() {
  return useContext(DbContext)
}

/**
 * A pipeline to upgrade the database
 *
 * When the database version is less than the version of the pipeline, the upgrade function of the pipeline will be executed
 *
 * 数据库升级管道
 *
 * 当数据库版本小于管道的版本时，将执行管道的升级函数
 *
 * @export
 * @interface DbUpgradePipeline
 */
export interface DbUpgradePipeline {
  version: number
  upgrade: (db: IDBPDatabase<any>) => Promise<void>
}

/**
 * Provide the database instance of idb
 *
 * You need to provide the database name, current version, store names, and pipelines for upgrading
 *
 * [dbName] database name
 *
 * [currentVersion] current database version
 *
 * [storeNames] store names must be provided
 *
 * [pipelines] upgrade pipelines in type of DbUpgradePipeline (optional)
 *
 * [fallback] fallback component before the database is initialized (optional)
 *
 * [alertMessages] alert messages when the database is blocked or blocking (optional)
 *
 * 提供 idb 的数据库实例
 *
 * 您需要提供数据库名称、当前版本、存储名称和升级管道
 *
 * [dbName] 数据库名称
 *
 * [currentVersion] 当前数据库版本
 *
 * [storeNames] 必须提供存储名称
 *
 * [pipelines] 升级管道，类型为 DbUpgradePipeline (可选)
 *
 * [fallback] 数据库初始化前的回退组件 (可选)
 *
 * [alertMessages] 数据库被阻止或阻塞时的警告消息 (可选)
 *
 * @export
 * @param {PropsWithChildren<{
 *     dbName: string
 *     currentVersion: number
 *     storeNames: string[]
 *     pipelines?: DbUpgradePipeline[]
 *     fallback?: React.ReactNode
 *     alertMessages?: {
 *       blocked: string
 *       blocking: string
 *     }
 *   }>} props
 * @return {*}
 */
export function IdbProvider(
  props: PropsWithChildren<{
    dbName: string
    currentVersion: number
    storeNames: string[]
    pipelines?: DbUpgradePipeline[]
    fallback?: React.ReactNode
    alertMessages?: {
      blocked: string
      blocking: string
    }
  }>
) {
  const [db, setDb] = useState<null | IDBPDatabase<any>>(null)
  const propsRef = useRef(props)
  useLayoutEffect(() => {
    openDB(propsRef.current.dbName, propsRef.current.currentVersion, {
      async upgrade(db, oldV, newV, transaction) {
        console.log(`database upgrading: ${oldV} -> ${newV}`)
        // we shall not remove any store
        for (let store of propsRef.current.storeNames) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { autoIncrement: true })
          }
        }
        await transaction.done
        for (let pipeline of propsRef.current.pipelines || []) {
          if (newV && newV < pipeline.version) {
            await pipeline.upgrade(db)
          }
        }
      },
      blocked() {
        alert(
          propsRef.current.alertMessages?.blocked ||
            "database was blocked, please close other tabs"
        )
      },
      blocking() {
        alert(
          propsRef.current.alertMessages?.blocking ||
            "database was blocking, please close other tabs"
        )
      },
    })
      .then(setDb)
      .catch((err) => {
        console.error("fail to initialized database", err)
      })
  }, [])
  return useMemo(() => {
    if (db) {
      return (
        <DbContext.Provider value={db}>{props.children}</DbContext.Provider>
      )
    } else {
      return props.fallback || null
    }
  }, [db])
}

/**
 * Bind a state to idb
 *
 * When the state changes, it will be written to the database
 *
 * [storeName] database store name
 *
 * [key] key of storeName
 *
 * [state] reactive state
 *
 * [readCb] will be called when the state is read from the database, parameter is the data read from the database in any type
 *
 * [writeCb] will be called when the state is written to the database, return type should be the same as the parameter of readCb (defined by user)
 *
 * 绑定状态到 idb
 *
 * 当状态改变时，将写入数据库
 *
 * [storeName] 数据库存储名称
 *
 * [key] storeName 的键
 *
 * [state] 响应式状态
 *
 * [readCb] 当从数据库读取状态时将被调用，参数是从数据库读取的数据，类型为 any
 *
 * [writeCb] 当状态写入数据库时将被调用，返回类型应与 readCb 的参数类型相同 (由用户定义)
 *
 * @export
 * @template T
 * @param {string} storeName
 * @param {string} key
 * @param {T} state
 * @param {(data: any) => void} readCb
 * @param {(val: T) => any} writeCb
 */
export function useIdbBind<T>(
  storeName: string,
  key: string,
  state: T,
  readCb: (data: any) => void,
  writeCb: (val: T) => any
) {
  const [processing, setProcessing] = useState<"" | "reading" | "writing">("")
  const readRef = useRef(readCb)
  readRef.current = readCb
  const writeRef = useRef(writeCb)
  writeRef.current = writeCb
  const db = useIdb()
  useLayoutEffect(() => {
    const handle = () => {
      setProcessing("reading")
      db.get(storeName, key)
        .then((res) => {
          readRef.current(res)
          setProcessing("")
        })
        .catch((err) => {
          console.error("fail to read from database", err)
          setProcessing("")
        })
    }
    handle()
    // listen to visibility change
    document.addEventListener("visibilitychange", handle)
    return () => document.removeEventListener("visibilitychange", handle)
  }, [storeName, key, db, readRef])
  useEffect(() => {
    // do not write when reading
    if (processing === "reading") return
    setProcessing("writing")
    db.put(storeName, writeRef.current(state), key)
      .then(() => {
        setProcessing("")
      })
      .catch((err) => {
        console.error("fail to write to database", err)
        setProcessing("")
      })
  }, [state, storeName, key, db, writeRef, processing])
}
