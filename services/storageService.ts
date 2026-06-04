// Author: forsearch | Updated: 2026-04-30
import { ProjectState, AssetLibraryItem } from '../types';

const DB_NAME = 'AiMangaStudioDB';
const LEGACY_DB_NAME = ['Big', 'Banana', 'DB'].join('');
const DB_MIGRATION_KEY = 'ai_manga_studio_db_migrated';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const ASSET_STORE_NAME = 'assetLibrary';

let migrationPromise: Promise<void> | null = null;

const openNamedDB = (dbName: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const readStoreItems = <T>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  if (!db.objectStoreNames.contains(storeName)) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[]) || []);
    request.onerror = () => reject(request.error);
  });
};

const writeStoreItems = <T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> => {
  if (items.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const migrateLegacyDB = async (): Promise<void> => {
  if (localStorage.getItem(DB_MIGRATION_KEY) === 'true') {
    return;
  }

  let legacyDb: IDBDatabase | null = null;
  let targetDb: IDBDatabase | null = null;

  try {
    legacyDb = await openNamedDB(LEGACY_DB_NAME);
    targetDb = await openNamedDB(DB_NAME);

    const projects = await readStoreItems<ProjectState>(legacyDb, STORE_NAME);
    const assets = await readStoreItems<AssetLibraryItem>(legacyDb, ASSET_STORE_NAME);

    await writeStoreItems(targetDb, STORE_NAME, projects);
    await writeStoreItems(targetDb, ASSET_STORE_NAME, assets);
    localStorage.setItem(DB_MIGRATION_KEY, 'true');
  } catch (error) {
    console.warn('本地项目数据迁移失败，将使用新的数据库继续运行。', error);
  } finally {
    legacyDb?.close();
    targetDb?.close();
  }
};

const openDB = async (): Promise<IDBDatabase> => {
  migrationPromise ??= migrateLegacyDB();
  await migrationPromise;
  return openNamedDB(DB_NAME);
};

export const saveProjectToDB = async (project: ProjectState): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const p = { ...project, lastModified: Date.now() };
    const request = store.put(p);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadProjectFromDB = async (id: string): Promise<ProjectState> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        const project = request.result;
        // 舊專案可能沒有 renderLogs，需要補齊以免後續渲染日誌寫入失敗。
        if (!project.renderLogs) {
          project.renderLogs = [];
        }
        resolve(project);
      }
      else reject(new Error("Project not found"));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllProjectsMetadata = async (): Promise<ProjectState[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll(); 
    request.onsuccess = () => {
       const projects = request.result as ProjectState[];
       projects.sort((a, b) => b.lastModified - a.lastModified);
       resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveAssetToLibrary = async (item: AssetLibraryItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ASSET_STORE_NAME);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllAssetLibraryItems = async (): Promise<AssetLibraryItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readonly');
    const store = tx.objectStore(ASSET_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = (request.result as AssetLibraryItem[]) || [];
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteAssetFromLibrary = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ASSET_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    
    request.onerror = () => {
      console.error(`删除项目失败: ${id}`, request.error);
      reject(request.error);
    };
  });
};

export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('只支持图片文件'));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error('图片大小不能超过 10MB'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('图片读取失败'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const createNewProjectState = (): ProjectState => {
  const id = 'proj_' + Date.now().toString(36);
  return {
    id,
    title: '未命名项目',
    createdAt: Date.now(),
    lastModified: Date.now(),
    stage: 'script',
    targetDuration: '60s',
    language: '中文',
    visualStyle: 'live-action',
    shotGenerationModel: 'gpt-5.1',
    rawScript: `标题：示例剧本

场景 1
外景。夜晚街道 - 雨夜
霓虹灯在水坑中反射出破碎的光芒。
侦探（30岁,穿着风衣）站在街角,点燃了一支烟。

侦探
这雨什么时候才会停？`,
    scriptData: null,
    shots: [],
    isParsingScript: false,
    renderLogs: [],
  };
};
