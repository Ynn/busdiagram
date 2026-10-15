//! KNXnet/IP for a tunnelling server: frames, endpoints (HPAI) and connection data come
//! from knx-rs-core; this module adds what a server needs on top of them: where to reply,
//! and the description of the interface that ETS asks for (KNX Standard 03_08_02 Core).

use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};

use knx_rs_core::address::IndividualAddress;
use knx_rs_core::knxip::HostProtocol;
use knx_rs_core::knxip::dib::{DibType, KnxMedium};

pub use knx_rs_core::knxip::{
    ConnectionHeader, DEVICE_MGMT_CONNECTION, E_CONNECTION_ID, E_CONNECTION_TYPE, E_NO_ERROR,
    E_NO_MORE_CONNECTIONS, Hpai, KnxIpFrame, ServiceType, TUNNEL_CONNECTION, TUNNEL_LINKLAYER,
    tunnel_crd,
};

/// Requested tunnelling layer not supported (03_08_04 §2.6.3; not in knx-rs-core).
pub const E_TUNNELLING_LAYER: u8 = 0x29;

/// A frame, ready to send.
pub fn frame(service_type: ServiceType, body: Vec<u8>) -> Vec<u8> {
    KnxIpFrame { service_type, body }.to_bytes()
}

/// The UDP endpoint of a server, as an HPAI.
pub fn hpai(addr: SocketAddrV4) -> Hpai {
    Hpai {
        protocol: HostProtocol::Ipv4Udp,
        ip: addr.ip().octets(),
        port: addr.port(),
    }
}

/// Endpoint of an HPAI. "0.0.0.0:0" (route back through NAT) means: reply to the
/// address the request came from. Any other address must be that address too: this
/// server only answers the tool that asked. UDP only.
pub fn reply_to(hpai: &[u8], from: SocketAddr) -> Option<SocketAddr> {
    let h = Hpai::parse(hpai).filter(|h| h.protocol == HostProtocol::Ipv4Udp)?;
    if h.is_unspecified() && h.port == 0 {
        return Some(from);
    }
    let addr = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::from(h.ip), h.port));
    (addr.ip() == from.ip()).then_some(addr)
}

/// What the interface says about itself.
#[derive(Debug, Clone)]
pub struct Identity {
    pub individual_address: u16,
    pub tunnel_addresses: Vec<u16>,
    pub serial_number: [u8; 6],
    pub mac_address: [u8; 6],
    pub endpoint: SocketAddrV4,
    pub name: String,
}

impl Identity {
    /// Friendly name: 30 bytes, padded with zeros.
    pub fn friendly_name(&self) -> [u8; 30] {
        let mut out = [0u8; 30];
        for (d, s) in out.iter_mut().zip(self.name.bytes()) {
            *d = s;
        }
        out
    }

    /// Device information DIB (54 bytes) followed by the supported service families.
    /// knx-rs-core reads DIBs but does not write them.
    pub fn description(&self) -> Vec<u8> {
        let mut dib = vec![
            0x36,
            DibType::DeviceInformation.to_raw(),
            KnxMedium::Tp1.to_raw(),
            0x00, // device status: not in programming mode
        ];
        dib.extend_from_slice(&self.individual_address.to_be_bytes());
        dib.extend_from_slice(&[0x00, 0x00]); // project installation identifier
        dib.extend_from_slice(&self.serial_number);
        dib.extend_from_slice(&[224, 0, 23, 12]); // routing multicast (not used)
        dib.extend_from_slice(&self.mac_address);
        dib.extend_from_slice(&self.friendly_name());
        // Core, device management and tunnelling, version 1.
        dib.extend_from_slice(&[0x08, DibType::SupportedServiceFamilies.to_raw()]);
        dib.extend_from_slice(&[0x02, 0x01, 0x03, 0x01, 0x04, 0x01]);
        dib
    }
}

pub fn individual_text(ia: u16) -> String {
    IndividualAddress::from_raw(ia).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use knx_rs_core::knxip::dib::{DeviceInformationDib, DibSequence};

    #[test]
    fn replies_go_back_to_the_requester_only() {
        let from: SocketAddr = "127.0.0.1:50000".parse().unwrap_or_else(|_| unreachable!());
        assert_eq!(reply_to(&[8, 1, 0, 0, 0, 0, 0, 0], from), Some(from));
        let own = hpai("127.0.0.1:50001".parse().unwrap_or_else(|_| unreachable!()));
        assert_eq!(
            reply_to(&own.to_bytes(), from).map(|a| a.port()),
            Some(50001)
        );
        let other = hpai("10.0.0.2:50001".parse().unwrap_or_else(|_| unreachable!()));
        assert_eq!(reply_to(&other.to_bytes(), from), None);
        // TCP endpoints are not served.
        assert_eq!(reply_to(&[8, 2, 0, 0, 0, 0, 0, 0], from), None);
    }

    #[test]
    fn the_description_reads_back_with_knx_rs_core() {
        let id = Identity {
            individual_address: 0xFFFA,
            tunnel_addresses: vec![0xFFFB],
            serial_number: [1, 2, 3, 4, 5, 6],
            mac_address: [0; 6],
            endpoint: "127.0.0.1:3672".parse().unwrap_or_else(|_| unreachable!()),
            name: "BusDiagram".into(),
        };
        let bytes = id.description();
        let info = DeviceInformationDib::find_in(&bytes)
            .ok()
            .flatten()
            .unwrap_or_else(|| unreachable!());
        assert_eq!(info.individual_address(), 0xFFFA);
        assert_eq!(info.serial_number(), [1, 2, 3, 4, 5, 6]);
        assert_eq!(info.knx_medium(), Some(KnxMedium::Tp1));
        let families = DibSequence::parse(&bytes)
            .ok()
            .and_then(|s| s.get(DibType::SupportedServiceFamilies))
            .map(|d| d.data().to_vec());
        assert_eq!(families, Some(vec![0x02, 0x01, 0x03, 0x01, 0x04, 0x01]));
    }

    #[test]
    fn individual_addresses() {
        assert_eq!(individual_text(0xFFFB), "15.15.251");
    }
}
