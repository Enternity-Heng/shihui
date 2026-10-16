export type Conversion =
  | { kind: 'empty' | 'incomplete' | 'error'; message: string }
  | { kind: 'unicode'; text: string; html: string; source: string }
  | { kind: 'formula'; html: string; source: string };
export interface RenderReply { id: number; result: Conversion }
export interface ImageStyle {fontSize:number;foreground:string;background:string;padding:number;scale:number}
export interface Preferences { shortcut:string; captureShortcut:string; historyEnabled:boolean; autocomplete:boolean; draftEnabled:boolean; imageStyle:ImageStyle }
export interface AppState extends Preferences { registered: boolean; captureRegistered:boolean; target: string | null; notice: string; version: string; operation:Operation }
export type Operation='idle'|'capturing'|'recognizing'|'reviewing'|'confirming'|'exporting'|'inserting';
export interface ActionReply { ok: boolean; message: string; status:'completed'|'canceled'|'failed' }
export interface OcrReply extends ActionReply {latex?:string;thumbnail?:string;reviewId?:string;historyGeneration?:string;canceled?:boolean}
export interface CustomCommand { id:string; name:string; description:string; keywords:string[]; template:string }
export interface Favorite {id:string;name:string;source:string;updatedAt:string;categoryId?:string|null}
export interface FavoriteCategory {id:string;name:string}
export interface FavoriteLibrary {version:2;revision:number;favorites:Favorite[];categories:FavoriteCategory[]}
export interface ImportSummary {id:string;revision:number;added:number;skipped:number;renamed:number;categories:number}
export interface ReviewState {id:string;original:string;source:string;image?:string;origin:'file'|'clipboard'|'screen';baseVersion:number;historyGeneration?:string}
export interface WorkspaceSnapshot {version:1;editor:{text:string;start:number;end:number;linked?:import('../core/linked-fields').LinkedState|null};builder:import('../core/structures').BuilderState;review:ReviewState|null;panel:string|null;pseudocode?:import('../core/pseudocode').PseudocodeState;expression?:import('../core/expression-tools').ExpressionState;flowchart?:import('../core/flowchart').FlowState;diagram?:import('../core/specialty-diagrams').DiagramState}
export interface DraftReply {snapshot:WorkspaceSnapshot|null;epoch:number;warning?:string}
export interface DraftStatus {state:'saving'|'saved'|'failed';message:string;epoch:number}
export interface HistoryEntry { id:string; source:string; createdAt:string; updatedAt:string; origin:'manual'|'file'|'clipboard'|'screen'; action:string; image?:string; imageBytes?:number; imageRemoved?:boolean }
export interface HistoryPage { entries:HistoryEntry[]; total:number; page:number }
export interface MathBridge {
  state(): Promise<AppState>;
  render(source: string): Promise<RenderReply>;
  preview(source:string):Promise<Conversion>;
  previewPseudocode(source:string,lineNumbers:boolean):Promise<import('../core/pseudocode').PseudocodePreview>;
  outputPseudocode(source:string,lineNumbers:boolean,action:'copy-text'|'copy-image'|'save-png'):Promise<ActionReply>;
  previewFlowchart(value:import('../core/flowchart').FlowState):Promise<import('../core/flowchart').FlowPreview>;
  previewDiagram(value:import('../core/specialty-diagrams').DiagramState):Promise<import('../core/flowchart').FlowPreview>;
  outputDiagram(value:import('../core/specialty-diagrams').DiagramState,action:'copy-source'|'copy-image'|'save-png'):Promise<ActionReply>;
  copyCase(id:string):Promise<ActionReply>;
  outputFlowchart(value:import('../core/flowchart').FlowState,action:'copy-source'|'copy-image'|'save-png'):Promise<ActionReply>;
  editorVersion(version:number):Promise<void>;
  insert(id: number): Promise<ActionReply>;
  insertImage(id: number): Promise<ActionReply>;
  copy(id: number, type: 'source' | 'text' | 'image'): Promise<ActionReply>;
  save(id: number): Promise<ActionReply>;
  shortcut(value: string): Promise<ActionReply>;
  recognizeImage(source:'file'|'clipboard'|'screen'):Promise<OcrReply>;
  preferences(value:Partial<Preferences>):Promise<ActionReply>;
  commands():Promise<{commands:CustomCommand[];warning?:string}>;
  saveCommand(value:CustomCommand):Promise<ActionReply>;
  deleteCommand(id:string):Promise<ActionReply>;
  history(query:string,page:number):Promise<HistoryPage>;
  historyDetail(id:string):Promise<{entry:HistoryEntry;image?:string}>;
  historyPreview(id:string):Promise<Conversion>;
  deleteHistory(id:string):Promise<ActionReply>;
  clearHistory():Promise<ActionReply>;
  favorites():Promise<FavoriteLibrary&{warning?:string}>;
  saveFavorite(value:{id:string;name:string;source:string;categoryId?:string|null}):Promise<ActionReply>;
  deleteFavorite(id:string):Promise<ActionReply>;
  saveCategory(value:{id:string;name:string}):Promise<ActionReply>;
  deleteCategory(id:string):Promise<ActionReply>;
  exportFavorites():Promise<ActionReply>;
  importFavorites():Promise<ActionReply&{summary?:ImportSummary}>;
  commitFavoritesImport(id:string):Promise<ActionReply>;
  reviewImage(id:string):Promise<{image?:string}>;
  confirmReview(id:string,source:string):Promise<ActionReply>;
  discardReview(id:string):Promise<ActionReply>;
  restoreReview(value:ReviewState):Promise<ActionReply&{reviewId?:string}>;
  draft():Promise<DraftReply>;
  saveDraft(value:WorkspaceSnapshot,epoch:number):Promise<ActionReply>;
  flushDraft():Promise<ActionReply>;
  clearDraft():Promise<ActionReply&{epoch:number}>;
  onDraftStatus(callback:(value:DraftStatus)=>void):()=>void;
  onCaptureRequested(callback:()=>void):()=>void;
  cancelRecognition():Promise<ActionReply>;
  onRecognitionProgress(callback:(message:string)=>void):()=>void;
  hide(): void;
  onOpen(callback: (settings: boolean) => void): () => void;
  onState(callback: (state: AppState) => void): () => void;
}
