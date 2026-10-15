//! cEMI messages handled by the interface (KNX Standard 03_06_03 §4.1): L_Data frames,
//! relayed between ETS and the page, and local device management (M_PropRead,
//! M_PropWrite), answered by the interface itself when ETS connects. L_Data frames are read
//! and written with knx-rs-core; property services are not, so their answers are built here.

use knx_rs_core::cemi::CemiFrame;
use knx_rs_core::message::MessageCode;
use knx_rs_core::types::{AddressType, Confirm};

use knx_rs_core::address::IndividualAddress;

const M_PROP_READ_REQ: u8 = MessageCode::PropReadReq as u8;
const M_PROP_READ_CON: u8 = MessageCode::PropReadCon as u8;
const M_PROP_WRITE_REQ: u8 = MessageCode::PropWriteReq as u8;
const M_PROP_WRITE_CON: u8 = MessageCode::PropWriteCon as u8;

/// A well-formed L_Data frame (req, con or ind): a group telegram carrying at least an
/// APCI, or a frame to a device, which may be a transport control (T_Connect, T_ACK…).
pub fn l_data(f: &[u8]) -> Option<CemiFrame> {
    // knx-rs-core reads two TPDU octets even when the length is 0 (a transport control
    // has the TPCI only): such a frame is read with one octet added, which `bytes` removes.
    let frame = CemiFrame::parse(f).ok().or_else(|| {
        let ctrl = 2 + usize::from(*f.get(1)?);
        (f.get(ctrl + 6) == Some(&0) && f.len() == ctrl + 8).then(|| {
            let mut padded = f.to_vec();
            padded.push(0);
            CemiFrame::parse(&padded).ok()
        })?
    })?;
    let code = MessageCode::try_from(frame.message_code_raw()).ok()?;
    (matches!(
        code,
        MessageCode::LDataReq | MessageCode::LDataCon | MessageCode::LDataInd
    ) && (frame.npdu_length() >= 1 || !is_group(&frame)))
    .then_some(frame)
}

/// Bytes of a frame as sent: those of a transport control without the octet that
/// [`l_data`] added to read it.
pub fn bytes(f: &CemiFrame) -> Vec<u8> {
    let b = f.as_bytes();
    let ctrl = 2 + usize::from(f.additional_info_length());
    if f.npdu_length() == 0 {
        b.get(..ctrl + 8).unwrap_or(b).to_vec()
    } else {
        b.to_vec()
    }
}

/// Is this L_Data frame a group telegram (group destination)?
pub fn is_group(f: &CemiFrame) -> bool {
    f.address_type() == AddressType::Group
}

/// Same frame with another message code, without additional information, and with the
/// confirmation error bit cleared (a positive L_Data.con, or an L_Data.ind).
pub fn recode(f: &CemiFrame, code: MessageCode) -> Option<CemiFrame> {
    let ctrl = 2 + usize::from(f.additional_info_length());
    let mut bytes = vec![code as u8, 0x00];
    bytes.extend_from_slice(self::bytes(f).get(ctrl..)?);
    let mut out = l_data(&bytes)?;
    out.set_confirm(Confirm::NoError);
    Some(out)
}

/// Replace a source 0.0.0 with the tunnel's address, as an interface does.
pub fn fill_source(f: &mut CemiFrame, address: u16) {
    if f.source_address().raw() == 0 {
        f.set_source_address(IndividualAddress::from_raw(address));
    }
}

/// Properties of the interface (device object, cEMI server object, KNXnet/IP parameter
/// object) that ETS reads when it connects. An interface that stays silent makes ETS give
/// the connection up.
pub struct Properties {
    pub individual_address: u16,
    pub tunnel_addresses: Vec<u16>,
    pub serial_number: [u8; 6],
    pub mac_address: [u8; 6],
    pub ip: [u8; 4],
    pub friendly_name: [u8; 30],
}

const OT_DEVICE: u16 = 0;
const OT_CEMI_SERVER: u16 = 8;
const OT_KNXNETIP: u16 = 11;
const ERR_UNSPECIFIED: u8 = 0x00;
const ERR_READ_ONLY: u8 = 0x05;
const ERR_VOID_DP: u8 = 0x07;
const ERR_INDEX_RANGE: u8 = 0x09;

impl Properties {
    /// Element size and elements of a property.
    fn get(&self, object_type: u16, pid: u8) -> Option<(usize, Vec<u8>)> {
        let u8 = |v: u8| (1, vec![v]);
        let u16 = |v: u16| (2, v.to_be_bytes().to_vec());
        let bytes = |v: &[u8]| (v.len(), v.to_vec());
        Some(match (object_type, pid) {
            (OT_DEVICE | OT_CEMI_SERVER | OT_KNXNETIP, 1) => u16(object_type),
            (OT_DEVICE, 9) => u8(1), // firmware revision
            (OT_DEVICE, 11) => bytes(&self.serial_number),
            (OT_DEVICE, 12) => u16(0),                // manufacturer
            (OT_DEVICE, 15) => bytes(&[0; 10]),       // order info
            (OT_DEVICE, 56) => u16(15),               // max APDU length
            (OT_DEVICE, 78) => bytes(&[0; 6]),        // hardware type
            (OT_CEMI_SERVER, 51 | 53) => u16(0x0002), // medium: TP1
            (OT_CEMI_SERVER, 52) => u8(0),            // communication mode: data link
            (OT_KNXNETIP, 51) => u16(0),              // project installation
            (OT_KNXNETIP, 52) => u16(self.individual_address),
            (OT_KNXNETIP, 53) => (
                2,
                self.tunnel_addresses
                    .iter()
                    .flat_map(|a| a.to_be_bytes())
                    .collect(),
            ),
            (OT_KNXNETIP, 54 | 55) => u8(1), // IP assignment: manual
            (OT_KNXNETIP, 56) => u8(0),      // IP capabilities
            (OT_KNXNETIP, 57 | 60) => bytes(&self.ip),
            (OT_KNXNETIP, 58 | 61) => bytes(&[255, 0, 0, 0]),
            (OT_KNXNETIP, 59 | 62 | 63 | 66) => bytes(&[0; 4]),
            (OT_KNXNETIP, 64) => bytes(&self.mac_address),
            (OT_KNXNETIP, 67) => u8(16),      // TTL
            (OT_KNXNETIP, 68) => u16(0x0001), // capabilities: device management
            (OT_KNXNETIP, 76) => (1, self.friendly_name.to_vec()),
            _ => return None,
        })
    }

    /// Answer a local device management request; `None` for M_Reset or anything else.
    pub fn answer(&self, req: &[u8]) -> Option<Vec<u8>> {
        let code = *req.first()?;
        let con = match code {
            M_PROP_READ_REQ => M_PROP_READ_CON,
            M_PROP_WRITE_REQ => M_PROP_WRITE_CON,
            _ => return None,
        };
        // Header: code, object type (2), instance, PID, count (4 bits) and start (12 bits).
        let Some(&[_, ot_hi, ot_lo, instance, pid, ne_six, six_lo]) = req.get(..7) else {
            let mut v = req.to_vec();
            v.resize(7, 0);
            v[0] = con;
            v.push(ERR_UNSPECIFIED);
            return Some(v);
        };
        let object_type = u16::from_be_bytes([ot_hi, ot_lo]);
        let count = ne_six >> 4;
        let start = u16::from_be_bytes([ne_six & 0x0F, six_lo]);
        let head = |n: u8| {
            vec![
                con,
                ot_hi,
                ot_lo,
                instance,
                pid,
                (n << 4) | (ne_six & 0x0F),
                six_lo,
            ]
        };
        let error = |e: u8| {
            let mut v = head(0);
            v.push(e);
            v
        };
        if code == M_PROP_WRITE_REQ {
            // Setting the communication mode to "data link layer", what it already is, is
            // accepted; everything else is read only.
            let ok = (object_type, instance, pid, start, count) == (OT_CEMI_SERVER, 1, 52, 1, 1)
                && req.get(7..) == Some(&[0x00][..]);
            return Some(if ok { head(1) } else { error(ERR_READ_ONLY) });
        }
        let Some((size, data)) = (instance == 1)
            .then(|| self.get(object_type, pid))
            .flatten()
        else {
            return Some(error(ERR_VOID_DP));
        };
        if start == 0 {
            // Element 0: the number of elements.
            if count != 1 {
                return Some(error(ERR_INDEX_RANGE));
            }
            let n = u16::try_from(data.len() / size.max(1)).unwrap_or(u16::MAX);
            let mut v = head(1);
            v.extend_from_slice(&n.to_be_bytes());
            return Some(v);
        }
        let first = usize::from(start) - 1;
        match data.get(first * size..(first + usize::from(count)) * size) {
            Some(b) if count > 0 => {
                let mut v = head(count);
                v.extend_from_slice(b);
                Some(v)
            }
            _ => Some(error(ERR_INDEX_RANGE)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WRITE: [u8; 11] = [
        0x11, 0x00, 0xBC, 0xE0, 0x00, 0x00, 0x09, 0x01, 0x01, 0x00, 0x81,
    ];

    fn props() -> Properties {
        Properties {
            individual_address: 0xFFFA,
            tunnel_addresses: vec![0xFFFB, 0xFFFC],
            serial_number: [1, 2, 3, 4, 5, 6],
            mac_address: [0; 6],
            ip: [127, 0, 0, 1],
            friendly_name: [0; 30],
        }
    }

    #[test]
    fn group_frames() {
        let mut f = l_data(&WRITE).unwrap_or_else(|| unreachable!());
        assert!(is_group(&f));
        assert!(l_data(&WRITE[..10]).is_none());
        assert!(l_data(&[0xFC, 0x00, 0x0B, 0x01, 53, 0x10, 0x01]).is_none());
        fill_source(&mut f, 0xFFFB);
        assert_eq!(&f.as_bytes()[4..6], &[0xFF, 0xFB]);
        let con = recode(&f, MessageCode::LDataCon).unwrap_or_else(|| unreachable!());
        assert_eq!(con.as_bytes()[0], 0x2E);
        assert_eq!(&con.as_bytes()[1..], &f.as_bytes()[1..]);
        // Additional information is dropped, the confirmation error bit cleared.
        let mut with_info = vec![0x11, 0x02, 0x03, 0x00];
        with_info.extend_from_slice(&WRITE[2..]);
        with_info[4] |= 0x01;
        let ind = l_data(&with_info)
            .and_then(|f| recode(&f, MessageCode::LDataInd))
            .unwrap_or_else(|| unreachable!());
        assert_eq!(
            ind.as_bytes(),
            &[&[0x29, 0x00][..], &WRITE[2..]].concat()[..]
        );
    }

    #[test]
    fn tunnel_addresses_and_errors() {
        let p = props();
        // KNXnet/IP object (11), PID 53, two elements from 1.
        let r = p
            .answer(&[0xFC, 0x00, 0x0B, 0x01, 53, 0x20, 0x01])
            .unwrap_or_default();
        assert_eq!(
            r,
            [
                0xFB, 0x00, 0x0B, 0x01, 53, 0x20, 0x01, 0xFF, 0xFB, 0xFF, 0xFC
            ]
        );
        // Number of elements.
        let r = p
            .answer(&[0xFC, 0x00, 0x0B, 0x01, 53, 0x10, 0x00])
            .unwrap_or_default();
        assert_eq!(&r[7..], &[0x00, 0x02]);
        // Unknown property: negative confirmation.
        let r = p
            .answer(&[0xFC, 0x00, 0x00, 0x01, 200, 0x10, 0x01])
            .unwrap_or_default();
        assert_eq!(r, [0xFB, 0x00, 0x00, 0x01, 200, 0x00, 0x01, 0x07]);
        // Data link communication mode accepted, other writes refused.
        let r = p
            .answer(&[0xF6, 0x00, 0x08, 0x01, 52, 0x10, 0x01, 0x00])
            .unwrap_or_default();
        assert_eq!(r[5] >> 4, 1);
        let r = p
            .answer(&[0xF6, 0x00, 0x08, 0x01, 52, 0x10, 0x01, 0x01])
            .unwrap_or_default();
        assert_eq!(r.last(), Some(&0x05));
        assert!(p.answer(&[0xF1]).is_none());
    }
}
