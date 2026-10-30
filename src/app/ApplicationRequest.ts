import type { AttributeValue } from '../model/Shape.js';
import type { ShapeCreation } from '../model/ShapeFactory.js';

export interface InitRequest {
  readonly command: 'init';
  readonly width: number;
  readonly height: number;
}

export interface ReadRequest {
  readonly command: 'read';
  readonly filePath: string;
}

export interface CanvasRequest {
  readonly command: 'canvas';
  readonly width?: number;
  readonly height?: number;
}

export interface CreateRequest {
  readonly command: 'create';
  readonly shapeType: string;
  readonly id: string;
  readonly creation: ShapeCreation;
  readonly containerId?: string;
}

export interface MoveRequest {
  readonly command: 'move';
  readonly id: string;
  readonly dx: number;
  readonly dy: number;
}

export interface ScaleRequest {
  readonly command: 'scale';
  readonly id: string;
  readonly factor: number;
}

export interface SetRequest {
  readonly command: 'set';
  readonly id: string;
  readonly attribute: string;
  readonly value: AttributeValue;
}

export interface DeleteRequest {
  readonly command: 'delete';
  readonly id: string;
}

export interface GroupRequest {
  readonly command: 'group';
  readonly newGroupId: string;
  readonly ids: readonly string[];
}

export interface UngroupRequest {
  readonly command: 'ungroup';
  readonly id: string;
}

export interface AddToRequest {
  readonly command: 'addto';
  readonly containerId: string;
  readonly shapeId: string;
}

export interface FrontRequest {
  readonly command: 'front';
  readonly id: string;
}

export interface BackRequest {
  readonly command: 'back';
  readonly id: string;
}

export interface UndoRequest {
  readonly command: 'undo';
}

export interface RedoRequest {
  readonly command: 'redo';
}

export interface TreeRequest {
  readonly command: 'tree';
  readonly id?: string;
}

export interface ShowRequest {
  readonly command: 'show';
  readonly id: string;
}

export interface SaveRequest {
  readonly command: 'save';
  readonly filePath?: string;
}

export type ApplicationRequest =
  | InitRequest
  | ReadRequest
  | CanvasRequest
  | CreateRequest
  | MoveRequest
  | ScaleRequest
  | SetRequest
  | DeleteRequest
  | GroupRequest
  | UngroupRequest
  | AddToRequest
  | FrontRequest
  | BackRequest
  | UndoRequest
  | RedoRequest
  | TreeRequest
  | ShowRequest
  | SaveRequest;
