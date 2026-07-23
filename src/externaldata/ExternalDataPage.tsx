import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import ProviderList from './ProviderList';

export default function ExternalDataPage() {
  return (
    <SectionBox title="External Data">
      <ProviderList hideTitle />
    </SectionBox>
  );
}
