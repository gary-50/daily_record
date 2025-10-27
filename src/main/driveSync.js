const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class DriveSync {
    constructor(authClient) {
        this.authClient = authClient;
        this.drive = google.drive({ version: 'v3', auth: authClient });
        this.syncMetadataFile = 'sync-metadata.json';
    }

    // 获取或创建应用数据文件夹中的同步元数据
    async getSyncMetadata() {
        try {
            const response = await this.drive.files.list({
                spaces: 'appDataFolder',
                q: `name='${this.syncMetadataFile}' and trashed=false`,
                fields: 'files(id, name, modifiedTime)',
                pageSize: 1
            });

            if (response.data.files && response.data.files.length > 0) {
                const fileId = response.data.files[0].id;
                const content = await this.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }, { responseType: 'json' });

                return content.data;
            }
            
            return {
                lastSyncTime: null,
                exerciseVersion: 0,
                dietVersion: 0,
                deviceId: this.getDeviceId()
            };
        } catch (error) {
            console.error('获取同步元数据失败:', error);
            return {
                lastSyncTime: null,
                exerciseVersion: 0,
                dietVersion: 0,
                deviceId: this.getDeviceId()
            };
        }
    }

    // 保存同步元数据到云端
    async saveSyncMetadata(metadata) {
        try {
            const response = await this.drive.files.list({
                spaces: 'appDataFolder',
                q: `name='${this.syncMetadataFile}' and trashed=false`,
                fields: 'files(id)',
                pageSize: 1
            });

            const metadataContent = JSON.stringify(metadata, null, 2);

            if (response.data.files && response.data.files.length > 0) {
                // 更新现有文件
                const fileId = response.data.files[0].id;
                await this.drive.files.update({
                    fileId: fileId,
                    media: {
                        mimeType: 'application/json',
                        body: metadataContent
                    }
                });
            } else {
                // 创建新文件
                await this.drive.files.create({
                    requestBody: {
                        name: this.syncMetadataFile,
                        parents: ['appDataFolder']
                    },
                    media: {
                        mimeType: 'application/json',
                        body: metadataContent
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('保存同步元数据失败:', error);
            return false;
        }
    }

    // 上传数据到云端（增量）
    async uploadData(dataType, localData, localVersion) {
        try {
            const fileName = `${dataType}-data.json`;
            
            // 查找现有文件
            const response = await this.drive.files.list({
                spaces: 'appDataFolder',
                q: `name='${fileName}' and trashed=false`,
                fields: 'files(id, name)',
                pageSize: 1
            });

            const uploadData = {
                version: localVersion,
                lastModified: new Date().toISOString(),
                deviceId: this.getDeviceId(),
                data: localData
            };

            const media = {
                mimeType: 'application/json',
                body: JSON.stringify(uploadData, null, 2)
            };

            if (response.data.files && response.data.files.length > 0) {
                // 更新现有文件
                const fileId = response.data.files[0].id;
                await this.drive.files.update({
                    fileId: fileId,
                    media: media
                });
            } else {
                // 创建新文件
                await this.drive.files.create({
                    requestBody: {
                        name: fileName,
                        parents: ['appDataFolder']
                    },
                    media: media
                });
            }

            return { success: true, version: localVersion };
        } catch (error) {
            console.error(`上传${dataType}数据失败:`, error);
            return { success: false, error: error.message };
        }
    }

    // 从云端下载数据
    async downloadData(dataType) {
        try {
            const fileName = `${dataType}-data.json`;
            
            const response = await this.drive.files.list({
                spaces: 'appDataFolder',
                q: `name='${fileName}' and trashed=false`,
                fields: 'files(id, name)',
                pageSize: 1
            });

            if (response.data.files && response.data.files.length > 0) {
                const fileId = response.data.files[0].id;
                const content = await this.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }, { responseType: 'json' });

                return {
                    success: true,
                    data: content.data.data || [],
                    version: content.data.version || 0,
                    lastModified: content.data.lastModified,
                    deviceId: content.data.deviceId
                };
            }

            return { success: false, error: '云端没有数据' };
        } catch (error) {
            console.error(`下载${dataType}数据失败:`, error);
            return { success: false, error: error.message };
        }
    }

    // 智能合并数据（解决冲突）
    mergeData(localData, cloudData, localVersion, cloudVersion) {
        // 按照ID创建映射
        const localMap = new Map(localData.map(item => [item.id, item]));
        const cloudMap = new Map(cloudData.map(item => [item.id, item]));
        
        const mergedData = [];
        const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

        allIds.forEach(id => {
            const localItem = localMap.get(id);
            const cloudItem = cloudMap.get(id);

            if (localItem && cloudItem) {
                // 两边都有，选择最新的（考虑删除标记）
                // 如果本地标记为删除，使用本地版本（保持删除状态）
                if (localItem.deleted) {
                    mergedData.push(localItem);
                } else if (cloudItem.deleted) {
                    mergedData.push(cloudItem);
                } else {
                    // 都没删除，比较日期选择最新的
                    const localTime = new Date(localItem.date).getTime();
                    const cloudTime = new Date(cloudItem.date).getTime();
                    mergedData.push(localTime >= cloudTime ? localItem : cloudItem);
                }
            } else if (localItem) {
                // 只有本地有
                mergedData.push(localItem);
            } else if (cloudItem) {
                // 只有云端有
                // 关键修复：不再自动恢复云端记录
                // 只有当云端记录未标记为删除时才添加
                if (!cloudItem.deleted) {
                    mergedData.push(cloudItem);
                }
            }
        });

        // 按日期排序
        mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            data: mergedData,
            version: Math.max(localVersion, cloudVersion) + 1,
            hasConflicts: localVersion !== cloudVersion
        };
    }

    // 执行完整同步（启动时调用）
    async performFullSync(localExerciseData, localDietData, readJSONFile, writeJSONFile, DATA_FILE, DIET_DATA_FILE) {
        try {
            // 获取云端元数据
            const cloudMetadata = await this.getSyncMetadata();
            
            // 加载本地版本
            const localMetadata = {
                exerciseVersion: this.getLocalVersion('exercise') || 0,
                dietVersion: this.getLocalVersion('diet') || 0,
                deviceId: this.getDeviceId()
            };

            const syncResults = {
                exercise: { synced: false, conflicts: false },
                diet: { synced: false, conflicts: false }
            };

            // 同步运动数据
            const cloudExercise = await this.downloadData('exercise');
            if (cloudExercise.success) {
                const merged = this.mergeData(
                    localExerciseData,
                    cloudExercise.data,
                    localMetadata.exerciseVersion,
                    cloudExercise.version
                );

                if (merged.hasConflicts || merged.data.length !== localExerciseData.length) {
                    writeJSONFile(DATA_FILE, merged.data);
                    syncResults.exercise.conflicts = merged.hasConflicts;
                }

                await this.uploadData('exercise', merged.data, merged.version);
                this.saveLocalVersion('exercise', merged.version);
                syncResults.exercise.synced = true;
            } else {
                // 云端没有数据，上传本地数据
                await this.uploadData('exercise', localExerciseData, localMetadata.exerciseVersion + 1);
                this.saveLocalVersion('exercise', localMetadata.exerciseVersion + 1);
                syncResults.exercise.synced = true;
            }

            // 同步饮食数据
            const cloudDiet = await this.downloadData('diet');
            if (cloudDiet.success) {
                const merged = this.mergeData(
                    localDietData,
                    cloudDiet.data,
                    localMetadata.dietVersion,
                    cloudDiet.version
                );

                if (merged.hasConflicts || merged.data.length !== localDietData.length) {
                    writeJSONFile(DIET_DATA_FILE, merged.data);
                    syncResults.diet.conflicts = merged.hasConflicts;
                }

                await this.uploadData('diet', merged.data, merged.version);
                this.saveLocalVersion('diet', merged.version);
                syncResults.diet.synced = true;
            } else {
                // 云端没有数据，上传本地数据
                await this.uploadData('diet', localDietData, localMetadata.dietVersion + 1);
                this.saveLocalVersion('diet', localMetadata.dietVersion + 1);
                syncResults.diet.synced = true;
            }

            // 更新同步元数据
            await this.saveSyncMetadata({
                lastSyncTime: new Date().toISOString(),
                exerciseVersion: this.getLocalVersion('exercise'),
                dietVersion: this.getLocalVersion('diet'),
                deviceId: this.getDeviceId()
            });

            return {
                success: true,
                results: syncResults,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('同步失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 增量同步单个数据类型
    async syncDataType(dataType, localData, writeJSONFile, dataFilePath) {
        try {
            const localVersion = this.getLocalVersion(dataType) || 0;
            const cloudData = await this.downloadData(dataType);

            if (cloudData.success) {
                const merged = this.mergeData(
                    localData,
                    cloudData.data,
                    localVersion,
                    cloudData.version
                );

                writeJSONFile(dataFilePath, merged.data);
                await this.uploadData(dataType, merged.data, merged.version);
                this.saveLocalVersion(dataType, merged.version);

                return {
                    success: true,
                    hasConflicts: merged.hasConflicts,
                    version: merged.version
                };
            } else {
                // 云端没有数据，上传本地
                const newVersion = localVersion + 1;
                await this.uploadData(dataType, localData, newVersion);
                this.saveLocalVersion(dataType, newVersion);

                return {
                    success: true,
                    hasConflicts: false,
                    version: newVersion
                };
            }
        } catch (error) {
            console.error(`同步${dataType}数据失败:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取设备ID（用于多设备区分）
    getDeviceId() {
        const os = require('os');
        return `${os.hostname()}-${os.platform()}-${os.arch()}`;
    }

    // 本地版本管理（存储在内存中，也可以持久化到本地文件）
    saveLocalVersion(dataType, version) {
        if (!this.localVersions) {
            this.localVersions = {};
        }
        this.localVersions[dataType] = version;
    }

    getLocalVersion(dataType) {
        if (!this.localVersions) {
            this.localVersions = {};
        }
        return this.localVersions[dataType] || 0;
    }

    // 获取同步状态
    async getSyncStatus() {
        try {
            const metadata = await this.getSyncMetadata();
            return {
                success: true,
                lastSyncTime: metadata.lastSyncTime,
                exerciseVersion: metadata.exerciseVersion,
                dietVersion: metadata.dietVersion,
                deviceId: metadata.deviceId,
                currentDevice: this.getDeviceId()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = DriveSync;
