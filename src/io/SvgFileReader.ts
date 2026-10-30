import { readFileSync } from 'node:fs';

/** 只负责读取文件文本；XML 解析和模型构建由后续读取组件承担。 */
export class SvgFileReader {
    public read(filePath: string): string {
        return readFileSync(filePath, 'utf8');
    }
}
