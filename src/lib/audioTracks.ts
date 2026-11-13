export interface AudioTrack {
  title: string;
  path: string;
}

/**
 * Background audio tracks list.
 * Audio files are located in public/audio/
 * To add or remove tracks, edit this array.
 */
export const AUDIO_TRACKS: AudioTrack[] = [
  {
    title: 'Surah Rehman + Rain And Thunder Go To Sleep With Relaxing Quran Recitation',
    path: '/audio/surah-rahman.mp3',
  },
];

export const PLACEHOLDER_TRACK: AudioTrack = {
  title: 'No audio tracks available',
  path: '',
};
