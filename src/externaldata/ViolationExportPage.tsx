import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import ConnectionList from './ConnectionList';

export default function ViolationExportPage() {
  return (
    <SectionBox title="Violation Export">
      <ConnectionList hideTitle />
    </SectionBox>
  );
}
