import { useLocalSearchParams } from 'expo-router';
import DiaryEditorScreen from '../../src/screen/DiaryEditorScreen';

export default function EditEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DiaryEditorScreen entryId={id} />;
}