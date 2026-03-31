import { TextNode } from '../TextNode'
import { ImageNode } from '../ImageNode'
import { VideoNode } from '../VideoNode'
import { AudioNode } from '../AudioNode'
import { BlockNode } from '../BlockNode'

export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  block: BlockNode,
}